# Installation & Operations Guide

This guide is written for both local setup and production deployment of `fivem-watch`.

## 1) Prerequisites

- Node.js 18+ (LTS recommended)
- npm 9+
- A reachable FiveM host
- Network route from FiveM host → backend API
- Network route from admin browsers → backend API

## 2) Choose Deployment Topology

### Topology A — Single host (small communities)

- Backend API and dashboard run on one machine.
- FiveM server points to that machine via `BACKEND_URL`.

### Topology B — Split host (recommended)

- Backend API on a private/internal host.
- Dashboard served via reverse proxy (TLS) on public edge.
- FiveM host communicates with backend over private link/VPN.

## 3) Backend Provisioning

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

Operational guidance:

- `API_SECRET` must be long and random; rotate periodically.
- `CORS_ORIGIN` should be explicit origins in production (comma-separated).
- Never commit `.env` into version control.

## 4) Dashboard Provisioning

```bash
cd client
npm install
```

Only if backend URL differs from default, create `client/.env`:

```env
VITE_SERVER_URL=http://YOUR_BACKEND_IP:3001
```

For production static build:

```bash
cd client
npm run build
```

Serve generated assets behind Nginx/Caddy/Traefik with HTTPS.

## 5) FiveM Resource Provisioning

1. Copy `fivem-watch-resource` into `resources/`.
2. Update `fivem-watch-resource/config.js`:

```js
const FW_CONFIG = {
  BACKEND_URL: 'http://YOUR_BACKEND_IP:3001',
  API_SECRET: 'MATCH_SERVER_ENV_API_SECRET',
  TELEMETRY_INTERVAL: 1000,
  STREAM_FPS: 20,
  STREAM_QUALITY: 0.5,
  STREAM_RESOLUTION_SCALE: 0.5,
};
```

3. Add to `server.cfg`:

```cfg
ensure fivem-watch
```

Important naming rule:

- If resource folder remains `fivem-watch-resource`, rename it to `fivem-watch` or update NUI path references in `fxmanifest.lua` and `web/index.html`.

## 6) Start Sequence

1. Start backend:

```bash
cd server
npm start
```

2. Start dashboard (development):

```bash
cd client
npm run dev
```

3. Start/restart FiveM server.

4. Open dashboard and authenticate using `ADMIN_USERNAME` / `ADMIN_PASSWORD`.

## 7) Post-Install Validation (Runbook)

### Control-plane checks

- `GET /api/health` returns `status: ok`.
- Backend logs show admin socket connection.

### Telemetry checks

- Player list updates at expected interval.
- Map markers move as player positions change.

### Stream checks

- Start stream for one player.
- Backend logs indicate NUI connection and stream start.
- Frame appears in operator dashboard.
- Stop stream and verify stream loop terminates.

## 8) Security Hardening Baseline

- Replace default credentials before first public exposure.
- Restrict `CORS_ORIGIN` to trusted origins.
- Restrict backend ingress via firewall/security group.
- Use TLS termination for dashboard/API paths.
- Add process supervision (`systemd`, `pm2`, or containers).
- Centralize logs and alert on repeated auth failures.

## 9) Performance Tuning Strategy

When under load, tune in this order:

1. Lower `STREAM_RESOLUTION_SCALE`.
2. Lower `STREAM_FPS`.
3. Lower `STREAM_QUALITY`.
4. Increase backend resources and websocket capacity.

Telemetry load is usually secondary to frame throughput.

## 10) Troubleshooting Matrix

- **No players visible**
  - Verify `API_SECRET` parity between backend and resource config.
  - Verify FiveM host can reach `BACKEND_URL`.
- **Login fails or unreachable**
  - Verify backend process is healthy and `VITE_SERVER_URL` is correct.
  - Check CORS origin policy.
- **Stream fails with NUI not connected**
  - Confirm resource loaded on client and NUI socket established.
  - Check resource naming/path mismatch.
- **Map appears empty**
  - Verify tile tree exists under `client/public/styleSatelite/`.

## 11) Upgrade Procedure

1. Back up current `.env` and `fivem-watch-resource/config.js`.
2. Deploy new code to backend and dashboard.
3. Run `npm install` in `server/` and `client/` if dependencies changed.
4. Restart backend process.
5. Restart FiveM resource/server.
6. Re-run post-install validation checklist.

## 12) Related Documents

- `README.md` for project-level onboarding
- `docs/TECHNICAL-ARCHITECTURE.md` for system design and scalability decisions
