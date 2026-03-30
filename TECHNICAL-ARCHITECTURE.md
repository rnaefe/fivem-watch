# Technical Architecture

## 1) Architectural Intent

`fivem-watch` is designed as a low-latency, operationally simple observability plane for FiveM servers. The core design objective is to maximize real-time fidelity while minimizing coupling, deployment overhead, and runtime footprint on game clients.

Primary goals:

- Near real-time player telemetry propagation to operators.
- On-demand, watcher-scoped live player stream relay.
- Zero mandatory persistence (stateless backend process with in-memory working set).
- Minimal operational dependencies for self-hosted communities.

Non-goals (current version):

- Long-term event archival.
- Multi-tenant authorization domains.
- Exactly-once delivery guarantees.

## 2) Context and Bounded Domains

The system is intentionally split into three bounded contexts:

1. **Game Edge Context** (`fivem-watch-resource`)
   - Produces telemetry (server script).
   - Produces media frames (NUI script).
2. **Control Plane Context** (`server`)
   - Authenticates actors.
   - Validates ingest traffic.
   - Routes telemetry and media to interested admin sockets.
3. **Operator Experience Context** (`client`)
   - Renders live state and map overlays.
   - Initiates stream control commands.

This separation keeps game-native code lean and pushes orchestration concerns to the backend where observability and policy are easier to evolve.

## 3) Runtime Topology

### Components

- `fivem-watch-resource/server/main.js`
  - Periodic telemetry aggregator.
  - Push-only HTTP publisher toward `/api/ingest`.
- `fivem-watch-resource/client/main.js`
  - NUI bootstrapper and runtime config bridge.
- `fivem-watch-resource/web/index.html`
  - WebGL capture pipeline and frame publisher.
- `server/index.js`
  - Express REST endpoints.
  - Socket.io event router.
  - In-memory routing/index state.
- `client/src/*`
  - Admin UX, map projection layer, stream viewers.

### Trust Zones

- **Zone A (FiveM host)**: telemetry and frame producers.
- **Zone B (Backend host)**: control and routing authority.
- **Zone C (Admin browser)**: authenticated read/control clients.

The backend is the policy enforcement point between all zones.

## 4) Communication Model

### Telemetry Path

1. FiveM server gathers player metrics using native calls.
2. Snapshot array is POSTed to `POST /api/ingest` with `x-api-key`.
3. Backend updates `playersState` and emits `players_update` to authenticated admins.

Characteristics:

- Delivery model: at-most-once per interval.
- State model: latest snapshot wins.
- Recovery model: next interval self-heals missing payloads.

### Stream Path

1. Admin emits `start_stream(playerId)`.
2. Backend resolves target NUI socket from `nuiClients`.
3. Backend emits `start_capture` to that specific NUI socket.
4. NUI publishes `frame` events (base64 `image/webp`).
5. Backend relays `player_frame` only to watcher sockets of that player.
6. When watcher count reaches zero, backend emits `stop_capture`.

Characteristics:

- Interest-based fan-out (watcher set routing).
- Backpressure strategy: implicit quality/FPS reduction via runtime config.
- Resource lifecycle: stream loop exists only when demanded.

## 5) Backend In-Memory Domain Model

Current in-memory structures in `server/index.js`:

- `playersState: PlayerData[]`
- `nuiClients: Map<playerId, socketId>`
- `activeStreams: Set<playerId>`
- `adminSockets: Set<socketId>`
- `streamWatchers: Map<playerId, Set<adminSocketId>>`

Design rationale:

- O(1) lookup for per-player routing.
- Constant-time watcher membership updates.
- No frame broadcast amplification to non-interested clients.

Trade-off:

- Stateful process memory implies horizontal scaling needs session affinity or external coordination.

## 6) Security Posture (Current vs Target)

### Current posture

- Shared secret (`API_SECRET`) used for:
  - ingest authorization (`x-api-key`),
  - socket role admission (`handshake.auth.secret`),
  - admin token after login.

### Risks

- Secret reuse across trust boundaries increases blast radius.
- Token equals shared secret (no token rotation semantics).
- No role-scoped cryptographic claims.

### Recommended hardening path

1. Introduce JWT access tokens with short TTL and role claims.
2. Separate secrets per actor class (server-ingest, nui, admin).
3. Add rate limiting for `/api/auth/login` and `/api/ingest`.
4. Enforce TLS termination and strict CORS allowlists.
5. Add replay protection (nonce/timestamp signature) for ingest in hostile networks.

## 7) Reliability and Failure Modes

### Expected failures and behavior

- **Backend restart**: all in-memory routing state resets; actors reconnect and repopulate state.
- **NUI disconnect**: stream watchers receive stream errors or empty frames until reconnect.
- **FiveM telemetry interruption**: UI eventually displays stale data until next successful ingest.
- **Admin disconnect**: backend garbage-collects watcher memberships and auto-stops orphaned captures.

### Recovery model

- Connection-oriented self-recovery via Socket.io reconnection.
- Idempotent control operations (`start_stream` repeated is safe).
- Snapshot telemetry naturally converges on next successful interval.

## 8) Performance Engineering Notes

Key controls:

- `TELEMETRY_INTERVAL` governs backend ingest frequency.
- `STREAM_FPS`, `STREAM_RESOLUTION_SCALE`, `STREAM_QUALITY` govern stream cost.
- Frame routing is watcher-scoped, not global broadcast.

Heuristic guidance:

- If bandwidth constrained, reduce `STREAM_RESOLUTION_SCALE` first.
- If CPU constrained on client/NUI, reduce `STREAM_FPS`.
- If visual artifacts are acceptable, reduce `STREAM_QUALITY`.

## 9) Frontend Architecture

- `client/src/App.jsx`
  - session bootstrap, socket lifecycle, stream session orchestration.
- `client/src/components/GameMap.jsx`
  - Leaflet custom CRS transform aligned to GTA V coordinate space.
- `client/src/components/PlayerList.jsx`
  - indexed human operator interaction surface.
- `client/src/components/LiveStream.jsx`
  - per-player stream viewport with runtime quality controls.
- `client/src/socket.js`
  - singleton socket abstraction for deterministic subscription wiring.

The UI is intentionally thin: business routing logic remains in the backend control plane.

## 10) API and Event Contract (Canonical)

### REST

- `POST /api/auth/login`
  - request: `{ username, password }`
  - response: `{ success: true, token }` on success
- `GET /api/health`
  - response: process health and aggregate counts
- `POST /api/ingest`
  - header: `x-api-key`
  - body: `PlayerData[]`

### Socket Roles

- `admin`
- `fivem-server`
- `fivem-nui`

### Admin Commands

- `start_stream(playerId)`
- `stop_stream(playerId)`
- `update_stream_config({ playerId, config })`

### Admin Events

- `players_update(players)`
- `player_frame({ playerId, frame })`
- `stream_error({ playerId, error })`
- `server_offline`

### NUI Control Events

- inbound: `start_capture`, `stop_capture`, `update_config`
- outbound: `frame(base64Image)`

## 11) Scalability Roadmap

Current architecture is single-node optimized. For multi-node scale:

1. Externalize socket state (Redis adapter for Socket.io).
2. Externalize player/session indexes to shared cache.
3. Introduce sticky sessions or consistent routing for stream ownership.
4. Isolate frame relay into dedicated media gateway workers.
5. Add adaptive stream policy engine (target bitrate/FPS by client capacity).

## 12) Observability and SLO Baseline

Recommended production telemetry:

- Ingest RPS, ingest error rate, auth failures.
- Active admins, active streams, per-player watcher count.
- Frame relay throughput (frames/sec, bytes/sec).
- End-to-end latency (capture timestamp to browser paint).

Suggested initial SLOs:

- Telemetry freshness P95 < 2.5s.
- Stream startup latency P95 < 3s.
- Frame relay success rate > 99% under nominal load.

## 13) Architectural Decisions (Current)

- **ADR-001**: In-memory state over external datastore (simplicity first).
- **ADR-002**: Socket.io for bidirectional control/data channels.
- **ADR-003**: WebGL capture in NUI, activated only on demand.
- **ADR-004**: Snapshot telemetry model over event-sourcing model.

These decisions are coherent with the product goal: operational simplicity with acceptable real-time behavior for small-to-mid community servers.
