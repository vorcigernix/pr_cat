# Repository Guidelines

## Project Structure & Module Organization

- `app/`: Next.js App Router pages, layouts, and route handlers (API under `app/api/*`).
- `components/`: Shared React components (design-system primitives in `components/ui/`).
- `lib/`: Core application logic (DB access, GitHub integrations, services, shared utilities).
- `hooks/`: Reusable React hooks (naming pattern: `use-*.ts(x)`).
- `__tests__/`: Jest tests (`__tests__/lib` for unit-ish logic, `__tests__/api` for route-handler coverage).
- `migrations/`: SQL migration files (ordered `00x_*.sql`).
- `scripts/`: One-off Node scripts (e.g. `scripts/generate-mock-data.js`).
- `public/`: Static assets served by Next.js.

## Build, Test, and Development Commands

- `pnpm install`: Install dependencies (pnpm is the expected package manager).
- `pnpm dev`: Run local dev server (Next.js with Turbopack).
- `pnpm build` / `pnpm start`: Production build and local production server.
- `pnpm lint`: Run ESLint across the repo.
- `pnpm test`: Run the full Jest suite.
- `pnpm test:watch`: Watch mode for local iteration.
- `pnpm test:unit` / `pnpm test:integration`: Narrow runs for `__tests__/lib` and `__tests__/api`.
- `pnpm test:ci`: CI-style run with coverage enabled.

## Coding Style & Naming Conventions

- TypeScript is in `strict` mode; prefer explicit types at module boundaries and for public helpers in `lib/`.
- Use the path alias `@/…` for internal imports (configured in `tsconfig.json`).
- Keep components in PascalCase and hooks in the `use-*.ts(x)` pattern; colocate component-specific helpers nearby.
- Treat `pnpm-lock.yaml` as authoritative; update it only via `pnpm`.

## Testing Guidelines

- Jest + `next/jest` with `jsdom`; tests live under `__tests__/` and use `*.test.ts(x)`.
- Global coverage thresholds are enforced (see `jest.config.js`); include tests for new logic and bug fixes.

## Commit & Pull Request Guidelines

- Commit messages in history are short and topic-focused (e.g. “cleanup”, “db optimizations”); prefer an imperative summary and add an optional scope when helpful (`auth: …`, `db: …`).
- PRs should be small and atomic, include a clear description, and add screenshots for UI changes; run `pnpm lint` and relevant `pnpm test:*` commands before requesting review.

## Configuration & Security Tips

- Create local config via `cp environment.example .env.local` (see `ENVIRONMENT_SETUP.md` for GitHub/Turso details).
- For a fresh Turso database in development, initialize schema via `curl -X POST http://localhost:3000/api/migrate`.
- Never commit secrets or private keys; avoid logging raw tokens, webhook secrets, or JWT material.
