# Contributing to fivem-watch

Thank you for contributing.

## Goals

- Keep changes focused and easy to review.
- Preserve runtime stability for live servers.
- Keep documentation aligned with behavior changes.

## Development Setup

1. Install dependencies:
   - `cd server && npm install`
   - `cd client && npm install`
2. Copy server env:
   - `cd server && cp .env.example .env`
3. Start services:
   - `cd server && npm run dev`
   - `cd client && npm run dev`

## Branching Strategy

- Branch from `main`.
- Use short-lived feature/fix branches.
- Naming examples:
  - `feat/multi-admin-stream-controls`
  - `fix/nui-reconnect-timeout`
  - `docs/install-runbook-update`

## Commit Convention

Use conventional-style commit messages:

- `feat: add stream watcher cleanup`
- `fix: prevent duplicate start_capture emit`
- `docs: update installation topology section`
- `refactor: simplify socket role validation`

## Pull Request Checklist

Before opening a PR:

- [ ] Changes are scoped to one logical concern.
- [ ] `client` builds successfully (`npm run build`).
- [ ] Lint passes in `client` (`npm run lint`).
- [ ] Manual smoke test completed:
  - [ ] login works
  - [ ] players list updates
  - [ ] stream start/stop works
- [ ] Documentation updated when behavior/config changed.

## PR Description Template

Include:

1. **Problem** — what issue this solves.
2. **Approach** — key implementation decisions.
3. **Impact** — risk areas and compatibility notes.
4. **Validation** — commands/tests/manual checks performed.

## Coding Guidelines

- Prefer simple and explicit logic over abstraction-heavy patterns.
- Avoid unrelated refactors in the same PR.
- Keep public event/API contracts backward compatible when possible.
- If contract changes are required, update:
  - `README.md`
  - `INSTALL.md`
  - `TECHNICAL-ARCHITECTURE.md`
  - relevant module README files

## Security Guidelines

- Never commit secrets (`.env`, tokens, private keys).
- Treat `API_SECRET` as sensitive and rotate if exposed.
- Report security issues privately to maintainers.

## Documentation Standards

When updating docs:

- Keep examples copy-paste ready.
- Use actual defaults from source code.
- Prefer operational language (what to run, where, expected outcome).

## License

By contributing, you agree that your contributions are licensed under the project MIT license.
