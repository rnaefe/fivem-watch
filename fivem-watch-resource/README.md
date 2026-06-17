# fivem-watch FiveM Runtime (`fivem-watch-resource`)

FiveM resource that produces telemetry and on-demand NUI screen frames for the `fivem-watch` control plane.

The resource stays intentionally thin, but the capture path is where the project gets interesting: it bundles the needed CFX/Three primitives, captures through hidden NUI, scales before readback, packs pixels into `ImageData`, and ships WebP frames without requiring an external screenshot resource at runtime.

## Responsibilities

- Collect connected player telemetry at a fixed interval.
- Send full snapshots to backend `/api/ingest`.
- Bootstrap a hidden NUI page on player clients.
- Connect NUI clients to the backend as `fivem-nui`.
- Capture frames only after `start_capture`.
- Stop capture after `stop_capture`.
- Apply runtime stream settings without resource restart.
- Use a bundled CFX/Three capture runtime instead of requiring an external screenshot resource at runtime.

## Files

| File | Purpose |
|---|---|
| `fxmanifest.lua` | Resource manifest |
| `config.js` | Shared backend and stream config |
| `server/main.js` | Telemetry collector and HTTP publisher |
| `client/main.js` | NUI bootstrap bridge |
| `web/index.html` | WebGL capture engine |
| `web/socket.io.min.js` | Bundled Socket.io client |
| `web/cfx-three.min.js` | Bundled CFX Three.js integration |

## Capture Pipeline

The NUI capture path is self-contained inside this resource.

```txt
CfxTexture
  -> scaled WebGL render target
  -> pixel readback
  -> packed canvas ImageData
  -> WebP encode
  -> Socket.io frame
```

The render target is created at `viewport x STREAM_RESOLUTION_SCALE`, so resize happens before GPU readback instead of after a full-resolution copy. The scaled RGBA buffer is then packed into canvas `ImageData` and encoded as WebP. At `0.4` scale, that cuts pixel transfer substantially before the frame is encoded.

This keeps the resource independent from a separate screenshot runtime while still reusing the necessary CFX/Three capture primitives in a bundled form. The result is edge-side image processing with backend-controlled stream lifecycle.

## Configuration

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

`API_SECRET` must match the backend.

## Installation

Copy this folder into FiveM `resources/`.

Recommended path:

```txt
resources/fivem-watch-resource
```

Add to `server.cfg`:

```cfg
ensure fivem-watch-resource
```

Resource naming matters. `web/index.html` currently references `nui://fivem-watch-resource/...`; update those paths if the folder is renamed.

## Runtime Behavior

Telemetry:

```txt
setInterval -> collect players -> POST /api/ingest
```

Streaming:

```txt
backend start_capture -> NUI capture loop -> frame events
backend stop_capture  -> NUI capture loop stops
```

No capture loop runs while nobody is watching. That is the operational win behind the live-stream feature.

## Tuning

- Lower `STREAM_RESOLUTION_SCALE` first for bandwidth reduction.
- Lower `STREAM_FPS` for CPU and network relief.
- Lower `STREAM_QUALITY` when rough visual context is enough.

## Related Docs

- [Root README](../README.md)
- [Install Guide](../INSTALL.md)
- [Architecture](../TECHNICAL-ARCHITECTURE.md)
- [Configuration](../docs/CONFIGURATION.md)
