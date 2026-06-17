# fivem-watch Dashboard (`client`)

React operator console for live FiveM visibility.

The dashboard is the human-facing control surface: login, player list, GTA V map, stream windows, and runtime stream quality controls. It feels like the command center, but routing authority stays in the backend where policy and cleanup can be enforced.

## Responsibilities

- Authenticate through the backend.
- Maintain an authenticated Socket.io connection.
- Render current player telemetry.
- Place players on the GTA V satellite map.
- Start and stop player streams.
- Display multiple live stream overlays.
- Push quality preset changes to active captures.

The dashboard asks for visibility; it does not own the stream lifecycle. That split keeps the UI responsive without making the browser the source of truth.

## Stack

- React 19
- Vite 8
- Socket.io Client
- Leaflet + React-Leaflet
- Framer Motion
- Phosphor Icons

## Local Development

```bash
npm install
npm run dev
```

Default URL:

```txt
http://localhost:5173
```

Optional `.env`:

```env
VITE_SERVER_URL=http://localhost:3001
```

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Build production assets |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

## Contract With Backend

Receives:

- `players_update`
- `player_frame`
- `stream_started`
- `stream_stopped`
- `stream_error`
- `server_offline`

Emits:

- `start_stream`
- `stop_stream`
- `update_stream_config`

## Map Data

Expected tile path:

```txt
public/styleSatelite/{z}/{x}/{y}.jpg
```

Markers can still render without tiles, but the satellite map will appear blank.

## Key Files

- `src/App.jsx` - app state and socket lifecycle
- `src/socket.js` - singleton Socket.io client
- `src/components/LoginScreen.jsx` - login flow
- `src/components/PlayerList.jsx` - search and stream actions
- `src/components/GameMap.jsx` - custom CRS and map markers
- `src/components/LiveStream.jsx` - stream overlay and quality presets

## Related Docs

- [Root README](../README.md)
- [API Reference](../docs/API.md)
- [Configuration](../docs/CONFIGURATION.md)
