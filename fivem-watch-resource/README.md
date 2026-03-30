# fivem-watch FiveM Runtime (`fivem-watch-resource`)

![Module](https://img.shields.io/badge/module-fivem--resource-f59e0b)
![FiveM](https://img.shields.io/badge/fx_version-cerulean-3b82f6)
![Game](https://img.shields.io/badge/game-gta5-16a34a)
![Capture](https://img.shields.io/badge/capture-WebGL%20NUI-8b5cf6)

FiveM resource responsible for telemetry collection and on-demand screen capture from client NUI.

## Table of Contents

- [What this resource does](#what-this-resource-does)
- [Compatibility Matrix](#compatibility-matrix)
- [File Structure](#file-structure)
- [Configuration](#configuration)
- [Installation on FiveM](#installation-on-fivem)
- [Runtime Behavior](#runtime-behavior)
- [Dependencies](#dependencies)
- [Troubleshooting](#troubleshooting)
- [Security Notes](#security-notes)
- [Related Docs](#related-docs)

## What this resource does

- Collects connected player telemetry server-side at fixed intervals
- Sends snapshots to backend `/api/ingest` with API key header
- Bootstraps hidden NUI on clients for stream capture
- Captures game frames via WebGL and sends to backend socket relay

## Compatibility Matrix

| Component | Version / Requirement |
|---|---|
| FiveM FX Version | `cerulean` |
| Game | `gta5` |
| Backend API | `fivem-watch/server` reachable via `BACKEND_URL` |
| Shared Secret | Must match backend `API_SECRET` |

## File Structure

- `fxmanifest.lua` — resource manifest and file declarations
- `config.js` — shared runtime configuration
- `server/main.js` — telemetry collector and HTTP publisher
- `client/main.js` — NUI init bridge
- `web/index.html` — WebGL capture engine and socket client
- `web/socket.io.min.js` — bundled socket.io client
- `web/cfx-three.min.js` — bundled CFX Three.js integration

## Configuration

Edit `config.js`:

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

### Tuning Recommendations

- Lower `STREAM_RESOLUTION_SCALE` first for bandwidth savings.
- Lower `STREAM_FPS` if client CPU usage is high.
- Lower `STREAM_QUALITY` if artifacts are acceptable.

## Installation on FiveM

1. Copy resource folder into server `resources/`.
2. Ensure resource name/path consistency:
   - Preferred resource name: `fivem-watch`
   - If using another name, update NUI paths in `fxmanifest.lua` and `web/index.html`.
3. Add to `server.cfg`:

```cfg
ensure fivem-watch
```

## Module Contract

- Produces telemetry snapshots to backend ingest endpoint.
- Produces stream frames only when backend instructs `start_capture`.
- Accepts dynamic stream config updates (`streamFps`, `resolutionScale`, `streamQuality`) without resource restart.

## Runtime Behavior

- Telemetry loop runs every `TELEMETRY_INTERVAL` milliseconds.
- NUI capture loop is inactive until backend sends `start_capture`.
- On zero watchers, backend sends `stop_capture` and capture loop stops.

## Dependencies

- No database required.
- No external screenshot resource required.
- Uses Node built-in `http` module in FiveM server script.

## Troubleshooting

- **No telemetry in dashboard**:
  - Check `BACKEND_URL` reachability from FiveM host.
  - Validate `API_SECRET` matches backend env.
- **Stream does not start**:
  - Confirm client loaded resource and NUI connected.
  - Check backend logs for NUI client registration.
- **Resource loads but no capture**:
  - Verify Web assets listed in `fxmanifest.lua` are present.

## Security Notes

- Treat `API_SECRET` as sensitive and rotate periodically.
- Avoid exposing backend directly to untrusted networks.
- Prefer private networking between FiveM host and backend.

## Related Docs

- Root project docs: `../README.md`
- Install guide: `../INSTALL.md`
- Architecture guide: `../TECHNICAL-ARCHITECTURE.md`
