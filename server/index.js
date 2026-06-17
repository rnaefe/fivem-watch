/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  fivem-watch-server — Main Entry Point                      ║
 * ║  Real-time FiveM player monitoring backend                  ║
 * ║  Repository: https://github.com/user/fivem-watch            ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * This server handles two primary responsibilities:
 *
 * 1. TELEMETRY — Receives player location/status data from the
 *    FiveM server script and broadcasts it to admin dashboards.
 *
 * 2. MEDIA STREAM — Relays live screenshot frames captured from
 *    a player's game client (via NUI WebGL) to admin viewers.
 *
 * All communication uses Socket.io (WebSocket) for minimal latency.
 *
 * @module fivem-watch-server
 */

require('dotenv').config();

const express = require('express');
const fs = require('fs');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

// ─── Configuration ─────────────────────────────────────────────
const DEFAULT_SECRET = 'CHANGE_ME_TO_A_RANDOM_SECRET';
const DEFAULT_PASSWORD = 'CHANGE_ME';
const PORT = process.env.PORT || 3001;
const API_SECRET = process.env.API_SECRET || DEFAULT_SECRET;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || DEFAULT_PASSWORD;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';
const NODE_ENV = process.env.NODE_ENV || 'development';
const CLIENT_DIST = process.env.CLIENT_DIST || path.join(__dirname, '..', 'client', 'dist');
const MAX_PLAYERS_PER_INGEST = Number(process.env.MAX_PLAYERS_PER_INGEST || 2048);
const MAX_FRAME_LENGTH = Number(process.env.MAX_FRAME_LENGTH || 5_000_000);

function parseCorsOrigin(value) {
  return value.trim() === '*' ? true : value.split(',').map((s) => s.trim()).filter(Boolean);
}

function assertProductionConfig() {
  if (NODE_ENV !== 'production') return;
  const badSecret = !process.env.API_SECRET || API_SECRET === DEFAULT_SECRET || API_SECRET.length < 32;
  const badPassword = !process.env.ADMIN_PASSWORD || ADMIN_PASSWORD === DEFAULT_PASSWORD || ADMIN_PASSWORD.length < 12;
  if (badSecret || badPassword || CORS_ORIGIN.trim() === '*') {
    throw new Error('Refusing production start: set strong API_SECRET, ADMIN_PASSWORD, and explicit CORS_ORIGIN.');
  }
}

function normalizePlayer(player) {
  if (!player || typeof player !== 'object') return null;
  const id = Number(player.id);
  const x = Number(player.x);
  const y = Number(player.y);
  const z = Number(player.z);
  if (!Number.isInteger(id) || id < 0 || !Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
    return null;
  }
  return {
    id,
    name: String(player.name || `Player ${id}`).slice(0, 64),
    ping: Math.max(0, Number(player.ping) || 0),
    x,
    y,
    z,
    health: Math.max(0, Math.min(200, Number(player.health) || 0)),
    armor: Math.max(0, Math.min(100, Number(player.armor) || 0)),
    heading: ((Number(player.heading) || 0) % 360 + 360) % 360,
  };
}

function normalizePlayers(payload) {
  if (!Array.isArray(payload) || payload.length > MAX_PLAYERS_PER_INGEST) return null;
  const players = payload.map(normalizePlayer);
  return players.every(Boolean) ? players : null;
}

function sanitizeStreamConfig(config) {
  if (!config || typeof config !== 'object') return null;
  const numberOr = (value, fallback) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  };
  const next = {};
  if (config.streamFps !== undefined) next.streamFps = Math.max(1, Math.min(30, numberOr(config.streamFps, 1)));
  if (config.resolutionScale !== undefined) next.resolutionScale = Math.max(0.1, Math.min(1, numberOr(config.resolutionScale, 0.5)));
  if (config.streamQuality !== undefined) next.streamQuality = Math.max(0.1, Math.min(1, numberOr(config.streamQuality, 0.5)));
  return Object.keys(next).length ? next : null;
}

function isValidPlayerId(value) {
  return /^\d+$/.test(String(value));
}

function isValidFrame(data) {
  return typeof data === 'string' && data.length <= MAX_FRAME_LENGTH && data.startsWith('data:image/webp;base64,');
}

assertProductionConfig();

// ─── Express App ───────────────────────────────────────────────
const app = express();

/** Parse CORS origin — supports wildcard "*" or comma-separated URLs */
const parsedOrigin = parseCorsOrigin(CORS_ORIGIN);

app.disable('x-powered-by');
app.use(cors({ origin: parsedOrigin, credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cache-Control', 'no-store');
  next();
});

const server = http.createServer(app);

// ─── Socket.io Server ─────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: parsedOrigin,
    methods: ['GET', 'POST'],
  },
  maxHttpBufferSize: MAX_FRAME_LENGTH,
});

// ─── In-Memory State ──────────────────────────────────────────
/**
 * @typedef {Object} PlayerData
 * @property {number} id       — Server ID of the player
 * @property {string} name     — Player display name
 * @property {number} ping     — Current latency in ms
 * @property {number} x        — World X coordinate
 * @property {number} y        — World Y coordinate
 * @property {number} z        — World Z coordinate
 * @property {number} health   — Player health (0-200)
 * @property {number} armor    — Player armor (0-100)
 * @property {number} heading  — Player heading (0-360)
 */

/** @type {PlayerData[]} Current snapshot of all connected players */
let playersState = [];

/** @type {Map<string, string>} Map of "fivem player server id" → socket.id for NUI clients */
const nuiClients = new Map();

/** @type {Set<string>} Set of player server IDs currently being streamed */
const activeStreams = new Set();

/** @type {Set<string>} Authenticated admin socket IDs */
const adminSockets = new Set();

/** @type {Map<string, Set<string>>} Map of player server id → set of admin socket IDs watching */
const streamWatchers = new Map();
const loginAttempts = new Map();

function tooManyLoginAttempts(ip) {
  const now = Date.now();
  const state = loginAttempts.get(ip) || { count: 0, resetAt: now + 60_000 };
  if (state.resetAt < now) {
    state.count = 0;
    state.resetAt = now + 60_000;
  }
  state.count += 1;
  loginAttempts.set(ip, state);
  return state.count > 10;
}

// ─── REST Endpoints ───────────────────────────────────────────

/**
 * POST /api/auth/login
 * Authenticates an admin user and returns a simple token.
 *
 * @body {string} username
 * @body {string} password
 * @returns {{ success: boolean, token?: string, error?: string }}
 */
app.post('/api/auth/login', (req, res) => {
  if (tooManyLoginAttempts(req.ip)) {
    return res.status(429).json({ success: false, error: 'Too many attempts' });
  }

  const { username, password } = req.body;

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    // In production you'd use JWT — for this open-source tool
    // we use the API_SECRET itself as a simple bearer token
    return res.json({ success: true, token: API_SECRET });
  }

  return res.status(401).json({ success: false, error: 'Invalid credentials' });
});

/**
 * GET /api/health
 * Simple health-check endpoint for monitoring.
 */
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    players: playersState.length,
    streams: activeStreams.size,
    admins: adminSockets.size,
    uptime: process.uptime(),
  });
});

/**
 * POST /api/ingest
 * Receives player telemetry data from the FiveM server script.
 * Validates the x-api-key header and broadcasts to admin sockets.
 *
 * @body {PlayerData[]} — Array of player data objects
 */
app.post('/api/ingest', (req, res) => {
  const apiKey = req.headers['x-api-key'];

  if (apiKey !== API_SECRET) {
    return res.status(403).json({ error: 'Invalid API key' });
  }

  const players = normalizePlayers(req.body);
  if (!players) {
    return res.status(400).json({ error: 'Invalid player payload' });
  }

  playersState = players;
  // Broadcast to all authenticated admins
  for (const adminId of adminSockets) {
    io.to(adminId).emit('players_update', playersState);
  }

  return res.json({ ok: true });
});

// ─── Socket.io Connection Handling ────────────────────────────

io.on('connection', (socket) => {
  const { role, secret, playerId } = socket.handshake.auth;

  /**
   * ROLE: "fivem-server"
   * The FiveM server script connects with this role to push
   * telemetry data (player list, coords, health, etc.)
   */
  if (role === 'fivem-server' && secret === API_SECRET) {
    console.log(`[fivem-watch] ✓ FiveM server connected (${socket.id})`);

    /**
     * @event players_update
     * Receives the full player snapshot from the FiveM server.
     * @param {PlayerData[]} players — Array of all connected players
     */
    socket.on('players_update', (players) => {
      const normalized = normalizePlayers(players);
      if (!normalized) return;
      playersState = normalized;
      // Broadcast to all authenticated admins
      for (const adminId of adminSockets) {
        io.to(adminId).emit('players_update', playersState);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[fivem-watch] ✗ FiveM server disconnected`);
      playersState = [];
      // Notify admins the server went offline
      for (const adminId of adminSockets) {
        io.to(adminId).emit('server_offline');
      }
    });

    return;
  }

  /**
   * ROLE: "fivem-nui"
   * A player's hidden NUI browser connects with this role to
   * send live screenshot frames when an admin requests streaming.
   */
  if (role === 'fivem-nui' && secret === API_SECRET && playerId) {
    const pid = String(playerId);
    if (!isValidPlayerId(pid)) {
      socket.disconnect(true);
      return;
    }
    nuiClients.set(pid, socket.id);
    console.log(`[fivem-watch] ✓ NUI client connected for player #${pid} (${socket.id})`);

    /**
     * @event frame
     * Receives a single WebP frame data URL from the player's NUI.
     * Relays it ONLY to admin sockets that are watching this player.
     * @param {string} data — Base64-encoded WebP data URL
     */
    socket.on('frame', (data) => {
      if (!isValidFrame(data)) return;
      // DEBUG: console.log(`[fivem-watch] Frame received from #${pid}, length: ${data?.length || 0}`);
      const watchers = streamWatchers.get(pid);
      if (watchers) {
        for (const adminId of watchers) {
          io.to(adminId).emit('player_frame', { playerId: pid, frame: data });
        }
      }
    });

    socket.on('disconnect', () => {
      nuiClients.delete(pid);
      activeStreams.delete(pid);
      streamWatchers.delete(pid);
      console.log(`[fivem-watch] ✗ NUI client disconnected for player #${pid}`);
    });

    return;
  }

  /**
   * ROLE: "admin"
   * Dashboard users connect with this role to view players
   * on the map and request live screen streams.
   */
  if (role === 'admin' && secret === API_SECRET) {
    adminSockets.add(socket.id);
    console.log(`[fivem-watch] ✓ Admin connected (${socket.id})`);

    // Send current state immediately upon connection
    socket.emit('players_update', playersState);

    /**
     * @event start_stream
     * Admin requests to start watching a specific player's screen.
     * @param {string|number} targetPlayerId — Server ID of the player to watch
     */
    socket.on('start_stream', (targetPlayerId) => {
      const pid = String(targetPlayerId);
      if (!isValidPlayerId(pid)) return;
      const nuiSocketId = nuiClients.get(pid);

      if (!nuiSocketId) {
        socket.emit('stream_error', { playerId: pid, error: 'Player NUI not connected' });
        return;
      }

      // Register this admin as a watcher
      if (!streamWatchers.has(pid)) {
        streamWatchers.set(pid, new Set());
      }
      streamWatchers.get(pid).add(socket.id);

      // If not already streaming, tell the NUI to start capturing
      if (!activeStreams.has(pid)) {
        activeStreams.add(pid);
        io.to(nuiSocketId).emit('start_capture');
        console.log(`[fivem-watch] ▶ Stream started for player #${pid}`);
      }

      socket.emit('stream_started', { playerId: pid });
    });

    /**
     * @event update_stream_config
     * Relays dynamic stream settings (FPS, Quality, Scale) to the NUI.
     */
    socket.on('update_stream_config', (data) => {
      const { playerId, config } = data;
      const pid = String(playerId);
      if (!isValidPlayerId(pid)) return;
      const cleanConfig = sanitizeStreamConfig(config);
      if (!cleanConfig) return;
      const nuiSocketId = nuiClients.get(pid);
      if (nuiSocketId) {
        io.to(nuiSocketId).emit('update_config', cleanConfig);
      }
    });

    /**
     * @event stop_stream
     * Admin stops watching a specific player's screen.
     * If no other admin is watching, the NUI capture loop stops.
     * @param {string|number} targetPlayerId
     */
    socket.on('stop_stream', (targetPlayerId) => {
      const pid = String(targetPlayerId);
      if (!isValidPlayerId(pid)) return;
      const watchers = streamWatchers.get(pid);

      if (watchers) {
        watchers.delete(socket.id);

        // If no one is watching anymore, stop the NUI capture
        if (watchers.size === 0) {
          streamWatchers.delete(pid);
          activeStreams.delete(pid);

          const nuiSocketId = nuiClients.get(pid);
          if (nuiSocketId) {
            io.to(nuiSocketId).emit('stop_capture');
            console.log(`[fivem-watch] ■ Stream stopped for player #${pid}`);
          }
        }
      }

      socket.emit('stream_stopped', { playerId: pid });
    });

    socket.on('disconnect', () => {
      adminSockets.delete(socket.id);

      // Clean up any streams this admin was watching
      for (const [pid, watchers] of streamWatchers.entries()) {
        watchers.delete(socket.id);
        if (watchers.size === 0) {
          streamWatchers.delete(pid);
          activeStreams.delete(pid);

          const nuiSocketId = nuiClients.get(pid);
          if (nuiSocketId) {
            io.to(nuiSocketId).emit('stop_capture');
            console.log(`[fivem-watch] ■ Stream auto-stopped for player #${pid} (admin left)`);
          }
        }
      }

      console.log(`[fivem-watch] ✗ Admin disconnected (${socket.id})`);
    });

    return;
  }

  // Unauthorized connection — reject
  console.log(`[fivem-watch] ✗ Unauthorized connection rejected (${socket.id})`);
  socket.emit('auth_error', { error: 'Invalid role or secret' });
  socket.disconnect(true);
});

if (NODE_ENV === 'production' && fs.existsSync(path.join(CLIENT_DIST, 'index.html'))) {
  app.use(express.static(CLIENT_DIST, { index: false, maxAge: '1h' }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
} else if (NODE_ENV === 'production') {
  console.warn(`[fivem-watch] CLIENT_DIST not found, running API-only: ${CLIENT_DIST}`);
}

// ─── Server Start ─────────────────────────────────────────────
if (require.main === module) {
  server.listen(PORT, () => {
    console.log('');
    console.log('  ╔══════════════════════════════════════════╗');
    console.log('  ║      fivem-watch server is running       ║');
    console.log(`  ║      http://localhost:${PORT}              ║`);
    console.log('  ╚══════════════════════════════════════════╝');
    console.log('');
  });
}

module.exports = {
  normalizePlayer,
  normalizePlayers,
  sanitizeStreamConfig,
  isValidFrame,
  parseCorsOrigin,
};
