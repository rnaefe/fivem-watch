/**
 * socket.js — Singleton Socket.io client for the admin dashboard.
 *
 * Connects to the fivem-watch backend with role "admin" and
 * the shared API secret token.
 *
 * @module socket
 */

import { io } from 'socket.io-client';

/** Backend server URL */
const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

/** @type {import('socket.io-client').Socket | null} */
let socket = null;

/**
 * Initialize and return the Socket.io connection.
 * Reuses existing connection if already established.
 *
 * @param {string} token — The auth token received from /api/auth/login
 * @returns {import('socket.io-client').Socket}
 */
export function connectSocket(token) {
  if (socket && socket.connected) return socket;

  socket = io(SERVER_URL, {
    auth: {
      role: 'admin',
      secret: token,
    },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
  });

  socket.on('connect', () => {
    console.log('[fivem-watch] Connected to backend');
  });

  socket.on('disconnect', (reason) => {
    console.log('[fivem-watch] Disconnected:', reason);
  });

  socket.on('auth_error', (data) => {
    console.error('[fivem-watch] Auth error:', data.error);
  });

  return socket;
}

/**
 * Get the current socket instance (may be null if not connected).
 * @returns {import('socket.io-client').Socket | null}
 */
export function getSocket() {
  return socket;
}

/**
 * Disconnect and destroy the socket instance.
 */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
