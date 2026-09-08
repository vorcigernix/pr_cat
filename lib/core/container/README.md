# Dependency injection container

Routes obtain typed services through `ServiceLocator`. The DI container selects demo or production adapters and owns their singleton instances. See the [architecture map](../../../docs/architecture/README.md) for module boundaries.

```typescript
import { ServiceLocator } from '@/lib/core'

const [metrics, pullRequests] = await Promise.all([
  ServiceLocator.getMetricsService(),
  ServiceLocator.getPullRequestRepository(),
])
```

Authenticate requests and resolve the user's organization before passing IDs to these services. See `withAuth` in `lib/core/application/auth-middleware.ts` and the metrics routes for complete examples.

For services without a typed getter, use `getService` with the port type and a registered service name. Factories are registered in `di-container.ts` and loaded on demand. Domain contracts live in `lib/core/ports`.

## Adapter selection

`EnvironmentConfig` selects demo mode when `DEMO_MODE=true` or when database/GitHub App configuration is incomplete. Production requires `TURSO_URL`, `TURSO_TOKEN`, `GITHUB_APP_ID`, and `GITHUB_APP_PRIVATE_KEY`.

| Service | Production adapter |
| --- | --- |
| PullRequestRepository | OptimizedTursoPullRequestRepository |
| MetricsService | OptimizedTursoMetricsService |
| AuthService | TursoAuthService |
| OrganizationRepository | TursoOrganizationRepository |
| Repository | TursoRepository |
| GitHubService | RealGitHubAPIService |
| GitHubAppService | GitHubAppService |

Demo mode registers the corresponding demo adapters. The production registration fallback is defined in `di-container.ts`.

## Tests and diagnostics

`DIContainer.reset()` clears the singleton for test isolation. `getContainer().getStatus()` reports registered and instantiated services; `/api/container-status` exposes the same status. Service tests should check observable results or real boundary behavior, rather than whether the container returns a configured mock.
