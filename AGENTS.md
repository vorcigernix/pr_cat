# Repository Guidelines

## Project Structure & Module Organization

- `app/`: Next.js App Router pages, layouts, and route handlers (API under `app/api/*`).
- `components/`: Shared React components (design-system primitives in `components/ui/`).
- `lib/`: Core application logic (DB access, GitHub integrations, services, shared utilities).
- `hooks/`: Reusable React hooks (naming pattern: `use-*.ts(x)`).
- `__tests__/`: Jest tests (`__tests__/lib` for unit-ish logic, `__tests__/api` for route-handler coverage).
- `migrations/`: SQL migration files (ordered `00x_*.sql`).
- `scripts/`: Maintenance scripts, including architecture checks and database benchmarks.
- `public/`: Static assets served by Next.js.

## Agent Orientation Harness

- Start with `docs/README.md` for reading order and architecture entrypoints.
- Canonical architecture map: `docs/architecture/README.md`.
- Current migration state (core vs legacy modules): `docs/architecture/migration-status.md`.
- Route-level implementation playbook: `docs/playbooks/change-routing.md`.
- Machine-readable architecture contracts:
- `docs/architecture/repository-manifest.json`
- `docs/architecture/dependency-rules.json`

## Build, Test, and Development Commands

Use Bun 1.4.2 for dependency management and package scripts. Keep Node.js 24+ installed (Node.js 22.13+ is also supported within the 22.x series) for the Next.js and Jest commands launched through `bun run`.

- `bun install`: Install dependencies; use `bun install --frozen-lockfile` in CI.
- `bun run dev`: Run local dev server (Next.js with Turbopack).
- `bun run build` / `bun run start`: Production build and local production server.
- `bun run lint`: Run ESLint and architecture harness checks across the repo.
- `bun run typecheck`: Generate Next.js route types and run TypeScript checks.
- `bun run architecture:check`: Validate architecture manifest and dependency boundaries.
- `bun run test`: Run the full Jest suite.
- `bun run test:watch`: Watch mode for local iteration.
- `bun run test:unit` / `bun run test:integration`: Narrow runs for `__tests__/lib` and `__tests__/api`.
- `bun run test:ci`: CI-style run with coverage enabled.

## Coding Style & Naming Conventions

- TypeScript is in `strict` mode; prefer explicit types at module boundaries and for public helpers in `lib/`.
- Use the path alias `@/…` for internal imports (configured in `tsconfig.json`).
- Keep components in PascalCase and hooks in the `use-*.ts(x)` pattern; colocate component-specific helpers nearby.
- Treat `bun.lock` as authoritative; update it only via Bun.

## Testing Guidelines

- Jest + `next/jest` with `jsdom`; tests live under `__tests__/` and use `*.test.ts(x)`.
- Global coverage thresholds are enforced (see `jest.config.js`); include tests for new logic and bug fixes.

## Commit & Pull Request Guidelines

- Commit messages in history are short and topic-focused (e.g. “cleanup”, “db optimizations”); prefer an imperative summary and add an optional scope when helpful (`auth: …`, `db: …`).
- PRs should be small and atomic, include a clear description, and add screenshots for UI changes; run `bun run lint` and relevant `bun run test:*` commands before requesting review.

## Configuration & Security Tips

- Create local config via `cp environment.example .env.local` (see `ENVIRONMENT_SETUP.md` for GitHub/Turso details).
- For a fresh Turso database in development, initialize schema via `curl -X POST http://localhost:3000/api/migrate`.
- Never commit secrets or private keys; avoid logging raw tokens, webhook secrets, or JWT material.
