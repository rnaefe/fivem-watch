# fivem-watch Control Plane (`server`)

![Module](https://img.shields.io/badge/module-server-10b981)
![Runtime](https://img.shields.io/badge/runtime-Node%2018%2B-22c55e)
![API](https://img.shields.io/badge/api-Express%204.x-black)
![WebSocket](https://img.shields.io/badge/socket.io-4.x-1f2937)

Express + Socket.io backend that authenticates operators, ingests telemetry, and relays live player frames.

## Table of Contents

- [Responsibilities](#responsibilities)
- [Compatibility Matrix](#compatibility-matrix)
- [Tech Stack](#tech-stack)
- [Setup](#setup)
- [Environment Variables](#environment-variables)
- [REST API](#rest-api)
- [Socket Roles](#socket-roles)
- [Internal State Model](#internal-state-model)
- [Production Guidance](#production-guidance)
- [Related Docs](#related-docs)

## Responsibilities

- Authenticate dashboard users via `POST /api/auth/login`
- Accept telemetry snapshots from FiveM via `POST /api/ingest`
- Maintain in-memory player and stream routing state
- Coordinate stream lifecycle between admins and NUI clients
- Expose health metrics via `GET /api/health`

## Compatibility Matrix

| Component | Version |
|---|---|
| Node.js | 18+ |
| npm | 9+ |
| Express | 4.x |
| Socket.io | 4.x |
| dotenv | 16.x |

## Tech Stack

- Node.js
- Express
- Socket.io
- dotenv
- cors

## Setup

```bash
npm install
cp .env.example .env
npm start
```

Development mode:

```bash
npm run dev
```

## Environment Variables

```env
PORT=3001
API_SECRET=CHANGE_ME_TO_A_RANDOM_SECRET
ADMIN_USERNAME=admin
ADMIN_PASSWORD=CHANGE_ME
CORS_ORIGIN=http://localhost:5173
```

### Notes

- `API_SECRET` must match `fivem-watch-resource/config.js`.
- `CORS_ORIGIN` supports `*` or comma-separated origins.
- Rotate secrets and credentials before production usage.

## REST API

### `POST /api/auth/login`

Request body:

```json
{ "username": "admin", "password": "your_password" }
```

Success response:

```json
{ "success": true, "token": "<secret>" }
```

### `POST /api/ingest`

Headers:

- `x-api-key: <API_SECRET>`

Body:

- Array of player telemetry objects.

### `GET /api/health`

Returns service status and runtime counters:

- players
- active streams
- connected admins
- process uptime

## Socket Roles

### `admin`

Receives:

- `players_update`
- `player_frame`
- `stream_error`
- `server_offline`

Emits:

- `start_stream`
- `stop_stream`
- `update_stream_config`

### `fivem-server`

Emits:

- `players_update`

### `fivem-nui`

Receives:

- `start_capture`
- `stop_capture`
- `update_config`

Emits:

- `frame`

## Internal State Model

Current runtime state (in-memory):

- `playersState`
- `nuiClients`
- `activeStreams`
- `adminSockets`
- `streamWatchers`

This design keeps latency low, but state is ephemeral across process restarts.

Service boundary note:

- This module is the policy/routing authority between admins, FiveM telemetry producer, and NUI media producers.
- It does not persist historical events; current-state routing is in memory by design.

## Production Guidance

- Run behind reverse proxy with TLS.
- Restrict inbound access by network policy.
- Use process supervision (`pm2`, `systemd`, or containers).
- Add centralized logging and alerting.
- Consider JWT + RBAC if exposing outside trusted networks.

## Related Docs

- Root architecture: `../TECHNICAL-ARCHITECTURE.md`
- Installation runbook: `../INSTALL.md`
