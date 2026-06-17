# Versioning & Release Policy

`fivem-watch` follows Semantic Versioning:

```txt
MAJOR.MINOR.PATCH
```

## Version Rules

| Version | Use when |
|---|---|
| `MAJOR` | REST, Socket.io, config, or deployment contracts break |
| `MINOR` | Backward-compatible capabilities are added |
| `PATCH` | Backward-compatible fixes or documentation corrections ship |

## Breaking Changes

These require a major release:

- Renaming or removing Socket.io events.
- Changing required REST payload shapes.
- Changing required config keys without fallback.
- Changing resource folder assumptions without migration notes.
- Changing auth behavior in a way that invalidates existing deployments.

## Release Checklist

1. Confirm backend and dashboard versions.
2. Update relevant docs.
3. Include migration notes for breaking changes.
4. Tag the release as `vX.Y.Z`.
5. Publish concise release notes with:
   - highlights
   - compatibility notes
   - upgrade steps if needed

## Compatibility Promise

Patch and minor releases should preserve existing deployments.

The core contracts are:

- `POST /api/ingest`
- `POST /api/auth/login`
- Socket roles: `admin`, `fivem-nui`, `fivem-server`
- Stream events: `start_stream`, `stop_stream`, `start_capture`, `stop_capture`, `player_frame`
- config keys in `server/.env` and `fivem-watch-resource/config.js`

## Labels

Recommended release labels:

- `breaking-change`
- `feature`
- `bug`
- `docs`
- `security`
- `performance`

## Backports

No LTS branch is maintained yet. Critical fixes should land on the latest stable release.
