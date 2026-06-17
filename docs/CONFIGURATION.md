# Configuration Reference

`fivem-watch` has three configuration surfaces: backend environment, dashboard build-time URL, and FiveM runtime settings. The knobs are intentionally close to the real cost centers: auth boundary, network target, telemetry cadence, and stream weight.

## Backend: `server/.env`

Create:

```bash
cd server
cp .env.example .env
```

Options:

| Name | Default | Required | Description |
|---|---|---|---|
| `PORT` | `3001` | No | HTTP and Socket.io port |
| `NODE_ENV` | `development` | No | Set to `production` to enforce production safety checks |
| `API_SECRET` | `CHANGE_ME_TO_A_RANDOM_SECRET` | Yes | Shared secret for ingest, NUI sockets, and dashboard token |
| `ADMIN_USERNAME` | `admin` | Yes | Dashboard login username |
| `ADMIN_PASSWORD` | `CHANGE_ME` | Yes | Dashboard login password |
| `CORS_ORIGIN` | `http://localhost:5173` | Yes | Allowed dashboard origin, `*`, or comma-separated origins |
| `CLIENT_DIST` | `../client/dist` | No | Static dashboard build path for production serving |
| `MAX_PLAYERS_PER_INGEST` | `2048` | No | Maximum accepted players per telemetry payload |
| `MAX_FRAME_LENGTH` | `5000000` | No | Maximum accepted frame payload size |

Production example:

```env
PORT=3001
NODE_ENV=production
API_SECRET=9f6a...long_random_hex
ADMIN_USERNAME=admin
ADMIN_PASSWORD=replace_this
CORS_ORIGIN=https://watch.example.com
CLIENT_DIST=../client/dist
```

Multiple origins:

```env
CORS_ORIGIN=https://watch.example.com,https://admin.example.com
```

## Dashboard: `client/.env`

Optional in local development. If omitted, the dashboard connects to `http://localhost:3001`.

```env
VITE_SERVER_URL=http://localhost:3001
```

Production:

```env
VITE_SERVER_URL=https://watch.example.com
```

Vite bakes this value into the build. Rebuild after changing it:

```bash
cd client
npm run build
```

## FiveM Resource: `fivem-watch-resource/config.js`

```js
const FW_CONFIG = {
  BACKEND_URL: 'http://localhost:3001',
  API_SECRET: 'CHANGE_ME_TO_A_RANDOM_SECRET',
  TELEMETRY_INTERVAL: 1000,
  STREAM_FPS: 20,
  STREAM_QUALITY: 0.5,
  STREAM_RESOLUTION_SCALE: 0.5,
};
```

Options:

| Name | Default | Description |
|---|---:|---|
| `BACKEND_URL` | `http://localhost:3001` | Backend URL reachable from FiveM and player clients |
| `API_SECRET` | `CHANGE_ME_TO_A_RANDOM_SECRET` | Must match backend `API_SECRET` |
| `TELEMETRY_INTERVAL` | `1000` | Milliseconds between player snapshots |
| `STREAM_FPS` | `20` | Default capture FPS |
| `STREAM_QUALITY` | `0.5` | WebP quality from `0.0` to `1.0` |
| `STREAM_RESOLUTION_SCALE` | `0.5` | Capture scale relative to viewport |

## Runtime Stream Presets

The dashboard can push stream settings to an active NUI capture session.

| Preset | `streamFps` | `resolutionScale` | `streamQuality` |
|---|---:|---:|---:|
| Low | 10 | 0.2 | 0.3 |
| Medium | 20 | 0.4 | 0.5 |
| High | 30 | 0.7 | 0.8 |

These changes do not require a resource restart. Operators can trade smoothness, clarity, and bandwidth while a stream is active.

## Secret Matching

These values must match:

```txt
server/.env API_SECRET
fivem-watch-resource/config.js FW_CONFIG.API_SECRET
```

Mismatch behavior:

- `/api/ingest` returns `403`.
- NUI sockets are rejected.
- Dashboard sockets fail auth after login token changes.

## Resource Name

The NUI page currently loads assets from:

```html
nui://fivem-watch-resource/web/socket.io.min.js
nui://fivem-watch-resource/web/cfx-three.min.js
```

If the resource folder is renamed, update those paths and the `ensure` line in `server.cfg`.
