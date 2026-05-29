# fivem-watch

Remote operator dashboard for FiveM / multiplayer servers.

`fivem-watch` moves live server monitoring out of the game and into a web dashboard. Operators can inspect player state, map position, and live session context remotely instead of manually joining the server and spectating players in-game.

<p align="left">
  <img alt="License" src="https://img.shields.io/badge/license-MIT-green" />
  <img alt="Node.js" src="https://img.shields.io/badge/node-%3E%3D18-339933" />
  <img alt="Status" src="https://img.shields.io/badge/status-active-blue" />
</p>

---

## Preview

[Watch preview video](https://streamable.com/da58u5)

---

## Why this exists

Running a live multiplayer server often means operators need to answer questions quickly:

- Where is this player?
- What is happening around them?
- Is the player alive, moving, damaged, or suspicious?
- Do I need to enter the game just to check context?

The usual workflow is manual: join the game, teleport/spectate, observe, then switch back to admin tooling.

`fivem-watch` replaces that with a remote operator console:

- player telemetry is pushed to a backend control plane
- operators view players on a live map
- live session context can be streamed on demand
- expensive frame capture only runs while someone is watching

The goal is simple:

> give operators live context without forcing them into the game.

---

## What it does

- Tracks player state in near real time
- Renders player positions on a GTA V map
- Streams live player session context to a browser dashboard
- Starts capture only when an operator is watching
- Stops capture automatically when no watcher remains
- Supports multiple operators watching the same player
- Keeps latest runtime state in memory for low-dependency deployment
- Runs as a self-hosted backend + dashboard + FiveM resource

---

## Architecture

```txt
FiveM Server Resource
  ├─ collects player snapshots
  ├─ sends telemetry to backend
  └─ controls NUI capture

        ↓ HTTP / Socket.io

Backend Control Plane
  ├─ auth / health / ingest endpoints
  ├─ Socket.io event router
  ├─ player state cache
  ├─ NUI socket index
  └─ watcher-scoped stream relay

        ↓ WebSocket

Operator Dashboard
  ├─ player list
  ├─ live map
  ├─ stream controls
  └─ live session viewer
```

The backend is the routing authority.

The FiveM resource emits state and frames.  
The dashboard consumes state and controls streams.  
The backend decides who receives what.

---

## Core idea: watcher-scoped streaming

A naive implementation would broadcast every captured frame to every connected admin.

That wastes bandwidth and browser resources.

`fivem-watch` routes frames only to operators watching that specific player:

```txt
NUI frame for player A
      ↓
backend checks streamWatchers[playerA]
      ↓
relay only to admins watching player A
```

When the last watcher leaves:

```txt
watcher count = 0
      ↓
backend emits stop_capture
      ↓
NUI stops frame capture
```

This keeps stream cost proportional to real demand.

---

## System components

### `fivem-watch-resource/`

FiveM runtime package.

Responsibilities:

- collect player snapshots
- send telemetry to the backend
- bootstrap hidden NUI capture context
- capture WebGL frames on demand
- emit frame payloads over Socket.io

### `server/`

Backend control plane.

Responsibilities:

- authenticate dashboard and ingest clients
- receive player telemetry snapshots
- keep latest player state in memory
- track admin and NUI sockets
- start/stop capture sessions
- relay frames only to active watchers

### `client/`

React operator dashboard.

Responsibilities:

- render player list and state
- display players on the map
- start/stop live streams
- show live session context
- expose basic stream controls

---

## Tech stack

```txt
Frontend: React, Vite, Leaflet
Backend:  Node.js, Express, Socket.io
Runtime:  FiveM resource, Lua/JS, NUI WebGL capture
State:    In-memory runtime indexes
Deploy:   Self-hosted Node.js backend + static dashboard
```

---

## Repository layout

```txt
.
├─ client/                 # React + Vite operator dashboard
├─ server/                 # Express + Socket.io control plane
├─ fivem-watch-resource/   # FiveM runtime package
├─ INSTALL.md              # installation and operations guide
├─ TECHNICAL-ARCHITECTURE.md
├─ CHANGELOG.md
└─ VERSIONING.md
```

---

## Quick start

### 1. Start the backend

```bash
cd server
cp .env.example .env
npm install
npm start
```

Example `server/.env`:

```env
PORT=3001
API_SECRET=CHANGE_ME_TO_A_RANDOM_SECRET
ADMIN_USERNAME=admin
ADMIN_PASSWORD=CHANGE_ME
CORS_ORIGIN=http://localhost:5173
```

---

### 2. Start the dashboard

```bash
cd client
npm install
npm run dev
```

Optional `client/.env`:

```env
VITE_SERVER_URL=http://YOUR_SERVER_IP:3001
```

---

### 3. Install the FiveM resource

Copy `fivem-watch-resource/` into your FiveM `resources/` directory.

Update `fivem-watch-resource/config.js`:

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

Add to `server.cfg`:

```cfg
ensure fivem-watch
```

> If the folder is named `fivem-watch-resource`, rename it to `fivem-watch` or update the NUI paths in `fxmanifest.lua` and `web/index.html`.

---

## Runtime flow

```txt
1. FiveM server posts player snapshots to POST /api/ingest.
2. Backend validates the shared secret and updates latest player state.
3. Backend emits players_update to authenticated operators.
4. Operator clicks watch on a player.
5. Backend sends start_capture to that player's NUI client.
6. NUI captures frames and emits them to the backend.
7. Backend relays frames only to watchers of that player.
8. When no watcher remains, backend sends stop_capture.
```

---

## API contract

### REST

```txt
POST /api/auth/login
GET  /api/health
POST /api/ingest
```

`POST /api/ingest` requires:

```txt
x-api-key: <server-secret>
```

Example ingest payload:

```json
[
  {
    "id": 12,
    "name": "player_name",
    "coords": {
      "x": 123.4,
      "y": 456.7,
      "z": 21.0
    },
    "health": 190,
    "armor": 50,
    "ping": 42,
    "heading": 180
  }
]
```

---

## Socket contract

### Socket roles

```txt
admin
fivem-server
fivem-nui
```

### Admin commands

```txt
start_stream(playerId)
stop_stream(playerId)
update_stream_config({ playerId, config })
```

### Events sent to dashboard

```txt
players_update(players)
player_frame({ playerId, frame })
stream_error({ playerId, error })
server_offline
```

### Events sent to NUI

```txt
start_capture
stop_capture
update_config
```

---

## Configuration reference

### `fivem-watch-resource/config.js`

| Key | Default | Description |
|---|---:|---|
| `BACKEND_URL` | `http://localhost:3001` | Control plane base URL |
| `API_SECRET` | `CHANGE_ME_TO_A_RANDOM_SECRET` | Shared auth secret |
| `TELEMETRY_INTERVAL` | `1000` | Snapshot interval in ms |
| `STREAM_FPS` | `20` | Capture frame rate target |
| `STREAM_QUALITY` | `0.5` | Image encoder quality |
| `STREAM_RESOLUTION_SCALE` | `0.5` | Capture resolution multiplier |

### `server/.env`

| Key | Default | Description |
|---|---:|---|
| `PORT` | `3001` | HTTP + websocket port |
| `API_SECRET` | `CHANGE_ME_TO_A_RANDOM_SECRET` | Shared secret across roles |
| `ADMIN_USERNAME` | `admin` | Login identity |
| `ADMIN_PASSWORD` | `CHANGE_ME` | Login credential |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed browser origin |

---

## Production readiness checklist

Before exposing this outside a trusted development network:

- replace all default credentials and secrets
- restrict `CORS_ORIGIN` to explicit dashboard origins
- serve dashboard and API through HTTPS/TLS termination
- keep backend behind a reverse proxy or trusted network boundary
- avoid exposing ingest endpoints publicly unless required
- add process supervision with PM2, systemd, or containers
- pin Node.js runtime and dependency versions in CI/CD
- rotate `API_SECRET` if the resource package is shared

---

## Common failure patterns

| Symptom | Likely cause |
|---|---|
| No players in dashboard | Backend unreachable from FiveM host or `API_SECRET` mismatch |
| Stream does not start | Target NUI socket is not connected |
| Browser login/network error | Incorrect `VITE_SERVER_URL` or `CORS_ORIGIN` |
| Map appears empty | Tile set missing under `client/public/styleSatelite/` |
| Stream starts but freezes | NUI capture stopped, player disconnected, or socket dropped |

---

## Design trade-offs

`fivem-watch` intentionally starts with a simple single-node model.

Current trade-offs:

- runtime state is kept in memory
- no mandatory database
- no historical replay
- no distributed media relay
- shared-secret auth is used for controlled self-hosted deployments

This keeps setup simple for the target audience.

For larger deployments, see [`TECHNICAL-ARCHITECTURE.md`](./TECHNICAL-ARCHITECTURE.md) for scaling and hardening paths.

---

## Documentation

- [Installation Guide](./INSTALL.md)
- [Technical Architecture](./TECHNICAL-ARCHITECTURE.md)
- [Versioning Policy](./VERSIONING.md)
- [Contributing Guide](./CONTRIBUTING.md)

---

## Contributing

Contributions are welcome.

For non-trivial changes, please include:

- the problem being solved
- architectural impact
- test or verification notes
- documentation updates for changed behavior or contracts

---

## License

MIT. See [LICENSE](./LICENSE).
