# fivem-watch Control Plane (`server`)

Express + Socket.io service that acts as the authority for auth, telemetry ingest, stream lifecycle, and watcher-scoped frame routing.

This module is where the project earns its control-plane shape: the backend does not capture frames, but it decides who is allowed to request capture, which NUI client should start, and which operators receive the resulting frames.

## Responsibilities

- Authenticate dashboard users through `POST /api/auth/login`.
- Accept player snapshots through `POST /api/ingest`.
- Maintain current player state in memory.
- Track admin sockets and player NUI sockets.
- Start capture only when a watcher exists.
- Relay frames only to operators subscribed to that player.
- Stop capture when the watcher set becomes empty.

## Stack

- Node.js 18+
- Express 4
- Socket.io 4
- dotenv
- cors

## Setup

```bash
npm install
cp .env.example .env
npm start
```

Development:

```bash
npm run dev
```

## Environment

```env
PORT=3001
API_SECRET=CHANGE_ME_TO_A_RANDOM_SECRET
ADMIN_USERNAME=admin
ADMIN_PASSWORD=CHANGE_ME
CORS_ORIGIN=http://localhost:5173
```

Notes:

- `API_SECRET` must match `fivem-watch-resource/config.js`.
- `CORS_ORIGIN` supports `*` or comma-separated origins.
- Production should use exact origins and rotated secrets.

## Runtime State

```txt
playersState      latest player snapshot
nuiClients        playerId -> NUI socket id
adminSockets      authenticated dashboard sockets
activeStreams     playerIds currently capturing
streamWatchers    playerId -> admin socket set
```

This is intentionally in memory for a lean single-node deployment. It keeps the hot path fast and the deployment small; external state can be added later when horizontal scale becomes real.

## API

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/auth/login` | Operator login |
| `GET` | `/api/health` | Health and counters |
| `POST` | `/api/ingest` | FiveM telemetry snapshot |

## Socket Roles

| Role | Purpose |
|---|---|
| `admin` | Dashboard control and viewing socket |
| `fivem-nui` | Hidden player-side capture socket |
| `fivem-server` | Socket telemetry compatibility role |

## Production Guidance

- Run behind TLS.
- Restrict inbound access where possible.
- Supervise the process with `systemd`, `pm2`, or containers.
- Add rate limiting before public exposure.
- Move to JWT/RBAC if multiple operator roles are needed.

## Related Docs

- [Root README](../README.md)
- [Architecture](../TECHNICAL-ARCHITECTURE.md)
- [API Reference](../docs/API.md)
