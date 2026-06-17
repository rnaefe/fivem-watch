# Contributing to fivem-watch

Thanks for helping improve `fivem-watch`.

This project is an operations tool. Changes should preserve live-server stability, clear runtime contracts, and boring deployment.

## Contribution Principles

- Keep changes scoped to one concern.
- Prefer explicit control-plane logic over clever abstraction.
- Preserve existing REST and Socket.io contracts unless the change is intentionally breaking.
- Update docs when behavior, config, events, or deployment steps change.
- Treat stream performance and cleanup paths as production concerns.

## Development Setup

```bash
cd server
npm install
cp .env.example .env
npm run dev
```

```bash
cd client
npm install
npm run dev
```

## Branch Naming

Examples:

- `feat/stream-quality-presets`
- `fix/watcher-cleanup`
- `docs/control-plane-architecture`
- `perf/frame-scale-tuning`

## Commit Style

Use short conventional commits:

- `feat: add stream watcher cleanup`
- `fix: reject invalid nui sockets`
- `docs: clarify relay architecture`
- `perf: reduce default capture scale`

## Pull Request Checklist

- [ ] Scope is focused.
- [ ] Backend starts successfully.
- [ ] Dashboard builds or the reason it was not run is documented.
- [ ] Login was smoke-tested when auth changed.
- [ ] Player telemetry was smoke-tested when ingest changed.
- [ ] Stream start/stop was smoke-tested when socket or NUI behavior changed.
- [ ] Docs were updated for behavior/config/API changes.

## PR Description

Include:

1. **Problem** - what this fixes or enables.
2. **Approach** - the important implementation decision.
3. **Impact** - compatibility, performance, security, or deployment notes.
4. **Validation** - commands and manual checks performed.

## Security

- Never commit `.env`, tokens, or private keys.
- Treat `API_SECRET` as sensitive.
- Rotate secrets if exposed.
- Report security-sensitive issues privately before publishing details.

## Documentation Standard

Docs should be:

- accurate to source behavior
- copy-paste ready where commands are shown
- clear about trade-offs
- professional enough to sell the architecture without inventing features

## License

By contributing, you agree your contributions are licensed under the MIT license.
