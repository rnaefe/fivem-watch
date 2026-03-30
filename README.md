# fivem-watch

![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-18%2B-22c55e)
![Status](https://img.shields.io/badge/status-open--source-blue)

Production-oriented, real-time FiveM monitoring platform with live map telemetry and on-demand player stream relay.

## Why this project

`fivem-watch` targets communities that need operational visibility without introducing heavy infrastructure. It provides a control plane for player observability while preserving low runtime overhead on the game side.

Core design principles:

- **Low operational complexity**: no mandatory database, no external media stack.
- **Low-latency control loop**: telemetry snapshots + websocket fan-out.
- **Demand-driven media cost**: capture starts only when at least one admin watches a player.

## System Components

- **FiveM Edge Runtime** (`fivem-watch-resource/`)
  - Server script publishes telemetry to backend.
  - Client script boots hidden NUI and passes runtime config.
  - NUI WebGL pipeline captures and emits `image/webp` frames.
- **Control Plane** (`server/`)
  - Express auth/health/ingest endpoints.
  - Socket.io role-based event router.
  - In-memory stream and watcher index.
- **Operator Console** (`client/`)
  - React dashboard for map, player state, and live streams.

## Key Capabilities

- Real-time player telemetry (ID, coordinates, ping, health, armor, heading)
- GTA V map visualization (Leaflet custom CRS + tile matrix)
- Multi-admin watcher model per player
- Runtime stream controls (FPS, quality, resolution scale)
- Zero-persistence runtime (latest state in memory)

## Repository Layout

```text
.
├─ client/                 # React + Vite operator dashboard
├─ server/                 # Express + Socket.io control plane
├─ fivem-watch-resource/   # FiveM runtime package
├─ INSTALL.md              # installation and operations guide
├─ TECHNICAL-ARCHITECTURE.md
└─ CHANGELOG.md            # release notes
```

## Quick Start (Developer)

### 1) Start backend

```bash
cd server
cp .env.example .env
npm install
npm start
```

Set `server/.env`:

```env
PORT=3001
API_SECRET=CHANGE_ME_TO_A_RANDOM_SECRET
ADMIN_USERNAME=admin
ADMIN_PASSWORD=CHANGE_ME
CORS_ORIGIN=http://localhost:5173
```

### 2) Start dashboard

```bash
cd client
npm install
npm run dev
```

Optional `client/.env`:

```env
VITE_SERVER_URL=http://YOUR_SERVER_IP:3001
```

### 3) Install resource on FiveM

Copy `fivem-watch-resource/` into your FiveM `resources/` directory and update `fivem-watch-resource/config.js`:

```js
const FW_CONFIG = {
  BACKEND_URL: 'http://YOUR_SERVER_IP:3001',
  API_SECRET: 'MATCH_SERVER_ENV_API_SECRET',
  TELEMETRY_INTERVAL: 1000,
  STREAM_FPS: 20,
  STREAM_QUALITY: 0.5,
  STREAM_RESOLUTION_SCALE: 0.5,
};
```

In `server.cfg`:

```cfg
ensure fivem-watch
```

> If the folder is named `fivem-watch-resource`, rename it to `fivem-watch` or update NUI paths in `fxmanifest.lua` and `web/index.html`.

## Production Readiness Checklist

- Replace all default credentials and secret values.
- Restrict `CORS_ORIGIN` to explicit dashboard origins.
- Expose backend only to trusted networks or behind reverse proxy.
- Serve dashboard and API through HTTPS/TLS termination.
- Pin Node.js runtime and dependency versions in CI/CD.
- Add process supervision (PM2/systemd/container orchestrator).

## Runtime Model (Condensed)

1. FiveM server posts snapshots to `POST /api/ingest` using `x-api-key`.
2. Backend validates and broadcasts `players_update` to authenticated admins.
3. Admin emits `start_stream(playerId)`.
4. Backend commands that player's NUI to `start_capture`.
5. NUI emits frame payloads; backend relays only to watchers of that player.
6. When watcher set becomes empty, backend emits `stop_capture`.

## Contracts

### REST

- `POST /api/auth/login` → `{ success, token }`
- `GET /api/health` → `{ status, players, streams, admins, uptime }`
- `POST /api/ingest` + `x-api-key` header → telemetry snapshot ingest

### Socket Roles

- `admin`
- `fivem-server`
- `fivem-nui`

## Configuration Reference

### `fivem-watch-resource/config.js`

| Key | Default | Description |
|---|---|---|
| `BACKEND_URL` | `http://localhost:3001` | Control plane base URL |
| `API_SECRET` | `CHANGE_ME_TO_A_RANDOM_SECRET` | Shared auth secret |
| `TELEMETRY_INTERVAL` | `1000` | Snapshot interval in ms |
| `STREAM_FPS` | `20` | Capture frame rate target |
| `STREAM_QUALITY` | `0.5` | Image encoder quality |
| `STREAM_RESOLUTION_SCALE` | `0.5` | Capture resolution multiplier |

### `server/.env`

| Key | Default | Description |
|---|---|---|
| `PORT` | `3001` | HTTP + websocket port |
| `API_SECRET` | `CHANGE_ME_TO_A_RANDOM_SECRET` | Shared secret across roles |
| `ADMIN_USERNAME` | `admin` | Login identity |
| `ADMIN_PASSWORD` | `CHANGE_ME` | Login credential |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed browser origins |

## Development Commands

```bash
cd server && npm run dev
cd client && npm run dev
cd client && npm run lint
cd client && npm run build
```

## Common Failure Patterns

- **No players in UI**: backend unreachable from FiveM host or `API_SECRET` mismatch.
- **Stream start fails**: target NUI socket not connected (`NUI client connected...` log missing).
- **Browser login/network errors**: incorrect `VITE_SERVER_URL` and/or `CORS_ORIGIN`.
- **Map appears empty**: tile set missing under `client/public/styleSatelite/`.

## Documentation

- [Installation Guide](INSTALL.md)
- [Technical Architecture](TECHNICAL-ARCHITECTURE.md)
- [Changelog](CHANGELOG.md)
- [Versioning Policy](VERSIONING.md)
- [Contributing Guide](CONTRIBUTING.md)

## Release & Governance

- Versioning follows Semantic Versioning. See [VERSIONING.md](VERSIONING.md).
- Release notes are maintained in [CHANGELOG.md](CHANGELOG.md).
- Contribution workflow and quality gate are defined in [CONTRIBUTING.md](CONTRIBUTING.md).
- Pull requests use [.github/pull_request_template.md](.github/pull_request_template.md).

## Contributing

Contributions are welcome. For non-trivial changes, include:

- problem statement and architectural impact,
- test/verification notes,
- documentation updates for any contract or behavior change.

## License

MIT. See [LICENSE](LICENSE).
