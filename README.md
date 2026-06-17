# fivem-watch

Self-hosted FiveM operations console with real-time player telemetry, GTA V map visibility, and demand-driven live player streaming.

`fivem-watch` is built for server teams that need live context without putting staff into the game for every check. It combines a lightweight control plane, distributed NUI capture, and watcher-scoped stream relay so operators can see what matters without turning every player client into a permanent video source.

<p align="left">
  <img alt="License" src="https://img.shields.io/badge/license-MIT-green" />
  <img alt="Node.js" src="https://img.shields.io/badge/node-%3E%3D18-339933" />
  <img alt="Architecture" src="https://img.shields.io/badge/architecture-watcher--scoped%20relay-blue" />
</p>

## Preview

[Watch preview video](https://streamable.com/da58u5)

## Engineering Highlights

`fivem-watch` is designed to feel powerful without being wasteful: the impressive part is live remote visibility; the operational part is that every expensive step is tied to explicit operator demand.

- **Watcher-scoped relay:** the backend tracks watchers per player and sends frames only to subscribed operators.
- **Demand-driven capture:** screen capture starts only after an authenticated operator requests a stream.
- **Distributed capture workload:** frame capture and encode run on the player-side NUI client, while the backend keeps routing and policy centralized.
- **Bundled CFX capture path:** the resource ships the required CFX/Three capture runtime directly, so it does not depend on an external screenshot resource at runtime.
- **Custom scaled readback/packing path:** frames are rendered at the requested capture scale before pixel readback, then packed into canvas `ImageData` and encoded as WebP.

The result is a sharp little observability pipeline: telemetry stays cheap, capture work moves to the edge, and backend bandwidth follows actual operator intent instead of global broadcast pressure.

```txt
NUI frame for player #24
      ↓
backend checks streamWatchers["24"]
      ↓
only subscribed operators receive the frame
      ↓
zero watchers means stop_capture
```

## Why Central Relay, Not P2P?

P2P looks attractive on paper. For an operator console, centralized relay is the stronger default because the backend is where auth, policy, cleanup, and stream ownership belong.

| Choice | Looks cool | Works well for ops | Why |
|---|---:|---:|---|
| P2P | High | Medium | NAT, firewall, browser permission, peer churn, and policy enforcement get messy |
| Central relay | High | High | One control plane owns auth, stream lifecycle, watcher accounting, and routing |

For moderation and observability tooling, control beats novelty. The backend is not just a pipe; it is the thing that makes the system operable under real server conditions.

The architecture is best described as:

> A real-time control plane with distributed NUI capture and watcher-scoped stream relay.

## Capabilities

- Operator login through the backend.
- Player telemetry ingest from the FiveM resource.
- Live player list with ID, name, ping, health, armor, and coordinates.
- GTA V satellite map rendering with player markers.
- On-demand live player stream windows.
- Multiple operators watching the same player without duplicate capture loops.
- Multiple player streams in the dashboard.
- Runtime stream quality updates.
- Automatic capture shutdown when nobody is watching.
- Bundled CFX/Three capture runtime with scaled WebGL readback and WebP encoding.
- No mandatory database, Redis, or external media server for the current single-node target.

## Architecture

```txt
FiveM Resource
  ├─ server/main.js      player snapshot producer
  ├─ client/main.js      hidden NUI bootstrap
  └─ web/index.html      WebGL capture engine

        ↓ HTTP + Socket.io

Backend Control Plane
  ├─ Express REST API
  ├─ Socket.io router
  ├─ in-memory player state
  ├─ NUI socket index
  └─ per-player watcher registry

        ↓ Socket.io

Operator Dashboard
  ├─ auth screen
  ├─ searchable player list
  ├─ GTA V map
  └─ live stream overlays
```

## Repository Layout

```txt
.
├─ client/                 # React + Vite operator dashboard
├─ server/                 # Express + Socket.io control plane
├─ fivem-watch-resource/   # FiveM telemetry and NUI capture resource
├─ docs/                   # API and configuration references
├─ INSTALL.md              # setup, deployment, and runbook
├─ TECHNICAL-ARCHITECTURE.md
├─ CONTRIBUTING.md
├─ VERSIONING.md
└─ LICENSE
```

## Quick Start

### 1. Backend

```bash
cd server
cp .env.example .env
npm install
npm start
```

Edit `server/.env`:

```env
PORT=3001
API_SECRET=CHANGE_ME_TO_A_RANDOM_SECRET
ADMIN_USERNAME=admin
ADMIN_PASSWORD=CHANGE_ME
CORS_ORIGIN=http://localhost:5173
```

Generate a real secret:

```bash
openssl rand -hex 32
```

### 2. Dashboard

```bash
cd client
npm install
npm run dev
```

Default URL:

```txt
http://localhost:5173
```

Optional `client/.env`:

```env
VITE_SERVER_URL=http://YOUR_BACKEND_HOST:3001
```

### 3. FiveM Resource

Copy `fivem-watch-resource/` into your FiveM `resources/` directory.

Recommended path:

```txt
resources/fivem-watch-resource
```

Edit `fivem-watch-resource/config.js`:

```js
const FW_CONFIG = {
  BACKEND_URL: 'http://YOUR_BACKEND_HOST:3001',
  API_SECRET: 'MATCH_SERVER_ENV_API_SECRET',
  TELEMETRY_INTERVAL: 1000,
  STREAM_FPS: 20,
  STREAM_QUALITY: 0.5,
  STREAM_RESOLUTION_SCALE: 0.5,
};
```

Add to `server.cfg`:

```cfg
ensure fivem-watch-resource
```

If you rename the resource folder, update the `nui://fivem-watch-resource/...` script paths in `fivem-watch-resource/web/index.html`.

## API Surface

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/auth/login` | Operator login |
| `GET` | `/api/health` | Runtime health and counters |
| `POST` | `/api/ingest` | FiveM player telemetry ingest |

Socket roles:

- `admin`
- `fivem-nui`
- `fivem-server` compatibility path

See [docs/API.md](docs/API.md).

## Operational Posture

- Single-node by design for easy self-hosting.
- Runtime state is in memory.
- Snapshot telemetry self-heals on the next interval.
- Stream routing is demand-driven.
- Horizontal scale can be added later with Redis/socket state and media gateway workers.

## Production Baseline

- Replace all default credentials.
- Use HTTPS through a reverse proxy.
- Set `CORS_ORIGIN` to exact dashboard origins.
- Keep `API_SECRET` long, random, and private.
- Restrict backend ingress where possible.
- Run the backend under a process supervisor.

## Documentation

- [INSTALL.md](INSTALL.md) - installation, deployment, and operations
- [TECHNICAL-ARCHITECTURE.md](TECHNICAL-ARCHITECTURE.md) - architecture, trust zones, scaling path
- [docs/API.md](docs/API.md) - REST and Socket.io contract
- [docs/CONFIGURATION.md](docs/CONFIGURATION.md) - environment and runtime config
- [server/README.md](server/README.md) - backend control plane
- [client/README.md](client/README.md) - dashboard application
- [fivem-watch-resource/README.md](fivem-watch-resource/README.md) - FiveM runtime resource

## License

MIT. See [LICENSE](LICENSE).
