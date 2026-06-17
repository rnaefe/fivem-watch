# Installation & Operations Guide

This guide gets `fivem-watch` from clone to live operator console.

The deployment model is intentionally lean: one Node.js control plane, one static dashboard, and one FiveM resource. The system feels like a live observability stack, but the operating model stays small enough to self-host without dragging in a database, media server, or screenshot sidecar.

## 1. Prerequisites

- Node.js 18+
- npm 9+
- FiveM server with JavaScript resource support
- Network path from FiveM host to backend
- Network path from operator browsers to backend

## 2. Recommended Topology

Development:

```txt
FiveM server -> local/LAN backend
operator browser -> Vite dashboard
```

Production:

```txt
FiveM server -> backend control plane
operator browser -> HTTPS reverse proxy -> dashboard/API
```

The backend should be treated as the control boundary. It owns auth, ingest validation, stream lifecycle, and watcher-scoped frame routing; capture work stays at the NUI edge.

## 3. Backend Setup

```bash
cd server
cp .env.example .env
npm install
```

Edit `server/.env`:

```env
PORT=3001
API_SECRET=CHANGE_ME_TO_A_RANDOM_SECRET
ADMIN_USERNAME=admin
ADMIN_PASSWORD=CHANGE_ME
CORS_ORIGIN=http://localhost:5173
```

Generate a production secret:

```bash
openssl rand -hex 32
```

Start:

```bash
npm start
```

Development mode:

```bash
npm run dev
```

Health check:

```bash
curl http://localhost:3001/api/health
```

Expected response shape:

```json
{
  "status": "ok",
  "players": 0,
  "streams": 0,
  "admins": 0,
  "uptime": 12.34
}
```

## 4. Dashboard Setup

```bash
cd client
npm install
npm run dev
```

Default URL:

```txt
http://localhost:5173
```

If the backend is not local, create `client/.env`:

```env
VITE_SERVER_URL=http://YOUR_BACKEND_HOST:3001
```

Production build:

```bash
npm run build
```

Serve `client/dist/` behind the same HTTPS edge as the API or another trusted static host.

## 5. FiveM Resource Setup

Copy `fivem-watch-resource/` into FiveM `resources/`.

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

Resource naming matters because `web/index.html` loads bundled assets through `nui://fivem-watch-resource/...`. If the folder name changes, update those NUI paths.

## 6. Start Order

1. Start backend.
2. Start or serve dashboard.
3. Start/restart FiveM resource.
4. Login to the dashboard.
5. Confirm player telemetry appears.
6. Start and stop one stream to verify capture lifecycle.

## 7. Production Baseline

- Replace default admin credentials.
- Keep `API_SECRET` long and private.
- Use exact `CORS_ORIGIN` values.
- Terminate TLS at a reverse proxy.
- Restrict backend ingress where possible.
- Run the backend with `systemd`, `pm2`, Docker, or another supervisor.
- Keep `.env` and resource config out of public repositories.

## 8. Performance Tuning

Stream load is the expensive path. The pipeline is built to make that cost adjustable instead of permanent. Tune in this order:

1. Lower `STREAM_RESOLUTION_SCALE`.
2. Lower `STREAM_FPS`.
3. Lower `STREAM_QUALITY`.

Dashboard presets:

| Preset | FPS | Scale | Quality |
|---|---:|---:|---:|
| Low | 10 | 0.2 | 0.3 |
| Medium | 20 | 0.4 | 0.5 |
| High | 30 | 0.7 | 0.8 |

Telemetry is cheap. Frame throughput is where bandwidth and CPU matter.

## 9. Validation Runbook

Backend:

- `GET /api/health` returns `status: ok`.
- Admin login creates a backend socket log.

Telemetry:

- FiveM console logs resource startup.
- Player count changes in `/api/health`.
- Dashboard player list and map update.

Streaming:

- Click watch on a player.
- Backend logs stream start.
- Stream overlay receives frames.
- Close the stream.
- Backend logs stream stop when the watcher set becomes empty.

## 10. Troubleshooting

| Problem | Likely cause | Fix |
|---|---|---|
| Dashboard cannot reach backend | Wrong `VITE_SERVER_URL` or backend down | Check URL, process, firewall |
| Login rejected | Credential mismatch | Check `server/.env` |
| CORS error | Dashboard origin not allowed | Update `CORS_ORIGIN` |
| No players visible | Ingest not accepted | Check `BACKEND_URL`, `API_SECRET`, FiveM networking |
| Stream error: NUI not connected | Player client did not connect hidden NUI | Check resource load and NUI script paths |
| Map has markers but no tiles | Tile assets missing | Verify `client/public/styleSatelite/` |
| Streams are heavy | Frame payload too large/frequent | Lower scale, FPS, then quality |

## 11. Upgrade Procedure

1. Back up `server/.env`.
2. Back up `fivem-watch-resource/config.js`.
3. Deploy updated files.
4. Run `npm install` in `server/` and `client/` if dependencies changed.
5. Rebuild dashboard if serving static files.
6. Restart backend.
7. Restart FiveM resource.
8. Run the validation checklist.

## 12. Related Docs

- [README.md](README.md)
- [TECHNICAL-ARCHITECTURE.md](TECHNICAL-ARCHITECTURE.md)
- [docs/API.md](docs/API.md)
- [docs/CONFIGURATION.md](docs/CONFIGURATION.md)
