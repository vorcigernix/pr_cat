# Playbook: Adding or Updating an API Route

Use this checklist for route work under `app/api/*`.

## Checklist

1. Keep transport logic in route files only.
Parse query/body input, map errors to HTTP responses, and do not embed domain calculations.

2. Resolve dependencies via core.
Use `withAuth` and `ApplicationContext` where auth is required, then get services via `ServiceLocator`.

3. Put business rules behind ports/adapters.
Define contracts in `lib/core/ports/*` and implement integrations in `lib/infrastructure/adapters/*`.

4. Add tests in `__tests__/api/*` for route behavior.

5. Run:

```bash
bun run lint
bun run test:integration
```

## Anti-patterns

- direct `@/lib/repositories/*` imports in new route handlers
- route handlers calling external providers directly
- mixing auth policy and business logic in large route files
