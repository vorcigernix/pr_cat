# Dependency Injection Container

The DI Container provides automatic service registration and resolution based on environment configuration, eliminating conditional logic throughout the application.

## Architecture Overview

```
┌─────────────────────────────────────┐
│           API Routes                │
│     (No conditional logic)          │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│         Service Locator             │
│    (Type-safe service access)       │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│        DI Container                 │
│   (Environment-based registration)  │
└─────────────────┬───────────────────┘
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
┌─────────────┐    ┌─────────────┐
│Demo Adapters│    │Prod Adapters│
│(Static Data)│    │(DB + GitHub)│
└─────────────┘    └─────────────┘
```

## Key Components

### 1. Environment Configuration (`EnvironmentConfig`)
- Auto-detects demo vs production mode
- Checks for required environment variables
- Provides configuration to the DI container

### 2. DI Container (`DIContainer`)
- Registers services based on environment
- Manages singleton instances
- Provides lazy loading of services
- Handles service dependencies

### 3. Service Locator (`ServiceLocator`)
- Type-safe service access
- Batch service loading
- React-friendly service access patterns

## Usage Examples

### Basic Service Access
```typescript
import { ServiceLocator } from '@/lib/core'

export async function GET() {
  // Get individual service
  const prRepository = await ServiceLocator.getPullRequestRepository()
  const recentPRs = await prRepository.getRecent('org-id')
  
  return NextResponse.json(recentPRs)
}
```

### Batch Service Loading
```typescript
import { getDashboardServices } from '@/lib/core'

export async function GET() {
  // Get multiple related services at once
  const { prRepository, metricsService, authService } = await getDashboardServices()
  
  const [summary, recentPRs, session] = await Promise.all([
    metricsService.getSummary('org-id'),
    prRepository.getRecent('org-id'),
    authService.getSession()
  ])
  
  return NextResponse.json({ summary, recentPRs, session })
}
```

### Direct Container Access
```typescript
import { DIContainer } from '@/lib/core'

const container = DIContainer.getInstance()
const prRepository = await container.get<IPullRequestRepository>('PullRequestRepository')
```

## Environment Detection

The container automatically switches between adapters based on:

| Environment Variables | Mode | Adapters Used |
|----------------------|------|---------------|
| `TURSO_URL` + `TURSO_TOKEN` + `GITHUB_APP_ID` + `GITHUB_PRIVATE_KEY` | Production | Database + GitHub API |
| Missing any of the above | Demo | Static/Generated Data |
| `DEMO_MODE=true` | Demo (Forced) | Static/Generated Data |

## Service Registration

Services are registered automatically based on environment:

### Demo Mode Services
```typescript
// All services use in-memory/static data
- PullRequestRepository → DemoPullRequestRepository
- MetricsService → DemoMetricsService  
- AuthService → DemoAuthService
- OrganizationRepository → DemoOrganizationRepository
- Repository → DemoRepository
- GitHubService → DemoGitHubService
```

### Production Mode Services (Future)
```typescript
// Services use real external dependencies
- PullRequestRepository → TursoPullRequestRepository
- MetricsService → TursoMetricsService
- AuthService → NextAuthService
- OrganizationRepository → TursoOrganizationRepository
- Repository → TursoRepository
- GitHubService → GitHubAPIService
```

## Benefits

1. **No Conditional Logic** ✅ - Business logic is clean and focused
2. **Environment-Aware** ✅ - Automatically adapts to available resources
3. **Type-Safe** ✅ - Full TypeScript support with proper interfaces
4. **Testable** ✅ - Easy to mock services for unit tests
5. **Performant** ✅ - Lazy loading and singleton patterns
6. **Extensible** ✅ - Easy to add new service types

## Testing

The container can be reset and reconfigured for testing:

```typescript
import { DIContainer, ServiceLocator } from '@/lib/core'

describe('My API Route', () => {
  beforeEach(() => {
    // Reset container for clean test state
    DIContainer.reset()
  })

  it('should work with demo services', async () => {
    // Services will be auto-registered based on test environment
    const prRepository = await ServiceLocator.getPullRequestRepository()
    // ... test logic
  })
})
```

## Debugging

Check container status at runtime:

```typescript
const container = DIContainer.getInstance()
const status = container.getStatus()
console.log('Container Status:', status)
```

Or visit `/api/container-status` to see the current state.

## Migration Guide

### Before (Conditional Logic)
```typescript
export async function GET() {
  const isDemoMode = !hasDatabase || !hasGitHubApp
  
  let data
  if (isDemoMode) {
    data = getDemoData()
  } else {
    data = await fetchFromDatabase()
  }
  
  return NextResponse.json(data)
}
```

### After (Clean DI)
```typescript
export async function GET() {
  const prRepository = await ServiceLocator.getPullRequestRepository()
  const data = await prRepository.getRecent('org-id')
  
  return NextResponse.json(data)
}
```

The conditional logic is eliminated - the container handles service selection automatically!
