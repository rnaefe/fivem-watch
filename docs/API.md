# API Reference

`fivem-watch` exposes a compact control-plane API: REST for login, health, and telemetry ingest; Socket.io for realtime state, commands, and frame relay. The API is small on purpose: it moves live data fast while keeping stream ownership explicit.

## Base URL

Default:

```txt
http://localhost:3001
```

The dashboard reads this from `VITE_SERVER_URL`. The FiveM resource reads it from `FW_CONFIG.BACKEND_URL`.

## REST API

### `POST /api/auth/login`

Authenticates an operator and returns the dashboard socket token.

Request:

```json
{
  "username": "admin",
  "password": "CHANGE_ME"
}
```

Success:

```json
{
  "success": true,
  "token": "API_SECRET_VALUE"
}
```

Failure:

```json
{
  "success": false,
  "error": "Invalid credentials"
}
```

### `GET /api/health`

Returns live control-plane counters.

```json
{
  "status": "ok",
  "players": 12,
  "streams": 2,
  "admins": 1,
  "uptime": 123.45
}
```

### `POST /api/ingest`

Receives the latest full player snapshot from the FiveM resource.

Headers:

```txt
x-api-key: API_SECRET_VALUE
content-type: application/json
```

Body:

```json
[
  {
    "id": 7,
    "name": "PlayerName",
    "ping": 42,
    "x": 123.4,
    "y": 567.8,
    "z": 21.0,
    "health": 100,
    "armor": 50,
    "heading": 180
  }
]
```

Success:

```json
{ "ok": true }
```

Invalid secret:

```json
{ "error": "Invalid API key" }
```

## Socket.io Roles

All sockets authenticate through the Socket.io `auth` payload.

### `admin`

Dashboard socket.

```js
io(SERVER_URL, {
  auth: {
    role: 'admin',
    secret: token
  },
  transports: ['websocket']
});
```

Receives:

| Event | Payload | Purpose |
|---|---|---|
| `players_update` | `PlayerData[]` | Latest telemetry snapshot |
| `player_frame` | `{ playerId, frame }` | Frame for a watched player |
| `stream_started` | `{ playerId }` | Watch request accepted |
| `stream_stopped` | `{ playerId }` | Stop request processed |
| `stream_error` | `{ playerId, error }` | Stream could not start |
| `server_offline` | none | FiveM producer disconnected |
| `auth_error` | `{ error }` | Socket auth rejected |

Emits:

| Event | Payload | Purpose |
|---|---|---|
| `start_stream` | `playerId` | Register this admin as a watcher |
| `stop_stream` | `playerId` | Remove this admin as a watcher |
| `update_stream_config` | `{ playerId, config }` | Adjust active capture settings |

### `fivem-nui`

Hidden player-side NUI capture socket.

```js
io(BACKEND_URL, {
  auth: {
    role: 'fivem-nui',
    secret: FW_CONFIG.API_SECRET,
    playerId
  },
  transports: ['websocket']
});
```

Receives:

| Event | Payload | Purpose |
|---|---|---|
| `start_capture` | none | Start frame capture |
| `stop_capture` | none | Stop frame capture |
| `update_config` | `{ streamFps, resolutionScale, streamQuality }` | Apply stream settings |

Emits:

| Event | Payload | Purpose |
|---|---|---|
| `frame` | data URL string | Captured WebP frame |

### `fivem-server`

Compatibility path for Socket.io telemetry. The current resource uses `POST /api/ingest`.

## Data Types

```ts
type PlayerData = {
  id: number;
  name: string;
  ping: number;
  x: number;
  y: number;
  z: number;
  health: number;
  armor: number;
  heading: number;
};
```

```ts
type StreamConfig = {
  streamFps?: number;
  resolutionScale?: number;
  streamQuality?: number;
};
```

Expected stream ranges:

- `streamFps`: practical range `3` to `30`
- `resolutionScale`: `0.1` to `1.0`
- `streamQuality`: `0.0` to `1.0`

## Routing Guarantee

Frames are not globally broadcast. The backend relays `player_frame` only to admin sockets registered in that player's watcher set, which is the core contract behind the watcher-scoped relay model.
