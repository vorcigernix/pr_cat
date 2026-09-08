# Docs Index

This repository includes a lightweight "harness" for both humans and coding agents.
If you are making code changes, read these in order:

1. [`docs/architecture/README.md`](./architecture/README.md)
2. [`docs/architecture/migration-status.md`](./architecture/migration-status.md)
3. [`docs/playbooks/change-routing.md`](./playbooks/change-routing.md)

## Why this exists

The codebase currently has a hybrid architecture:

- The preferred path uses `lib/core/*` + `lib/infrastructure/*`.
- Some routes and services still use legacy modules under `lib/services/*` and `lib/repositories/*`.

The goal of these docs is to make that state explicit so new work follows one path by default and migration can continue safely.

## Enforced checks

Run:

```bash
bun run architecture:check
```

This validates:

- architecture manifest integrity (`docs/architecture/repository-manifest.json`)
- dependency boundaries (`docs/architecture/dependency-rules.json`)

## Maintenance review

- [September 2026 maintenance changes and prioritized UX backlog](./maintenance-review-2026-09-07.md)
- [Database query improvements, index measurements, and remaining bottlenecks](./database-review-2026-09-07.md)
