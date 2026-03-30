# fivem-watch Dashboard (`client`)

![Module](https://img.shields.io/badge/module-client-0ea5e9)
![Runtime](https://img.shields.io/badge/runtime-Node%2018%2B-22c55e)
![Framework](https://img.shields.io/badge/framework-React%2019-61dafb)
![Bundler](https://img.shields.io/badge/bundler-Vite%208-646cff)

Operator-facing React application for real-time FiveM monitoring.

## Table of Contents

- [Purpose](#purpose)
- [Compatibility Matrix](#compatibility-matrix)
- [Stack](#stack)
- [Local Development](#local-development)
- [Environment](#environment)
- [Scripts](#scripts)
- [Module Contract](#module-contract)
- [Map Data](#map-data)
- [Key Files](#key-files)
- [Troubleshooting](#troubleshooting)

## Purpose

This module provides the admin control surface for:

- authenticating operators,
- observing live player telemetry on a GTA V map,
- starting/stopping live streams per player,
- adjusting stream quality presets at runtime.

## Compatibility Matrix

| Component | Version |
|---|---|
| Node.js | 18+ |
| npm | 9+ |
| React | 19.x |
| Vite | 8.x |
| Socket.io Client | 4.x |

## Stack

- React 19
- Vite 8
- Socket.io Client
- Leaflet + React-Leaflet
- Framer Motion

## Local Development

```bash
npm install
npm run dev
```

Default URL: `http://localhost:5173`

## Environment

Optional `.env`:

```env
VITE_SERVER_URL=http://localhost:3001
```

If omitted, the dashboard connects to `http://localhost:3001`.

## Scripts

- `npm run dev` — start development server
- `npm run build` — create production build
- `npm run preview` — preview build output
- `npm run lint` — run ESLint checks

## Module Contract

- Authenticates through backend `POST /api/auth/login` token flow.
- Subscribes to `players_update` for telemetry state.
- Subscribes to `player_frame` for stream rendering.
- Emits `start_stream`, `stop_stream`, and `update_stream_config` commands.

## Operational Notes

- Socket auth uses token returned by backend `POST /api/auth/login`.
- The dashboard subscribes to `players_update` and `player_frame` events.
- Stream windows are independent; multiple players can be watched in parallel.

## Map Data

Expected tile path:

`public/styleSatelite/{z}/{x}/{y}.jpg`

If tiles are missing, the map will render without satellite imagery.

## Key Files

- `src/App.jsx` — root state orchestration and socket lifecycle
- `src/socket.js` — singleton socket connection layer
- `src/components/LoginScreen.jsx` — credential-based login flow
- `src/components/PlayerList.jsx` — searchable player list + stream actions
- `src/components/GameMap.jsx` — custom CRS map projection + markers
- `src/components/LiveStream.jsx` — stream viewport, quality presets, fullscreen

## Troubleshooting

- **Cannot reach backend**: verify `VITE_SERVER_URL` and backend availability.
- **Login rejected**: validate backend credentials in `server/.env`.
- **No players shown**: check ingest path and `API_SECRET` parity.
- **No stream frames**: confirm NUI connection from target player.
