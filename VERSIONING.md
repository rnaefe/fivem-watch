# Versioning & Release Policy

This project follows Semantic Versioning (`MAJOR.MINOR.PATCH`).

## Versioning Rules

- **MAJOR**: breaking changes to API/event/config contracts.
- **MINOR**: backward-compatible features.
- **PATCH**: backward-compatible bug fixes and documentation-only corrections.

## What is considered breaking

Examples:

- Renaming/removing socket events used by dashboard or NUI.
- Changing required env/config keys without fallback.
- Altering payload shapes consumed by existing clients.

## Release Workflow

1. Finalize changes in `main`.
2. Update `CHANGELOG.md`:
   - Move items from `[Unreleased]` into the new version section.
3. Create release commit:
   - Update docs/version references if needed.
4. Create git tag:
   - `vX.Y.Z`
5. Publish release notes from changelog highlights.

## Compatibility Promise

- Patch and minor releases aim to preserve existing setup and runtime contracts.
- Breaking contract changes require a major version and migration notes.

## Recommended PR Labels

- `breaking-change`
- `feature`
- `bug`
- `docs`
- `security`
- `performance`

## Backport Policy

At this stage, no LTS branch is maintained. Critical fixes are applied to latest stable release.
