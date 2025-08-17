# Architecture Refactoring Plan: From Conditional Spaghetti to Clean Architecture

## Problem Statement

The current codebase has conditional logic scattered throughout, checking for demo mode at multiple levels:
- API routes checking environment variables
- Components handling different data sources
- Auth system with conditional mock data
- Database queries with fallbacks

This violates the **Single Responsibility Principle** and **Dependency Inversion Principle**, making the code:
- Hard to maintain
- Prone to bugs
- Difficult to test
- Inconsistent in behavior

## Proposed Solution: Hexagonal Architecture (Ports & Adapters)

### Why Hexagonal Architecture?

1. **Clear separation of concerns**: Business logic is isolated from infrastructure
2. **Testability**: Easy to test with mock adapters
3. **Flexibility**: Switch between implementations without changing core logic
4. **Consistency**: Same code paths for all modes

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Presentation Layer                    │
│                  (React Components, API Routes)          │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                    Application Layer                     │
│                    (Use Cases/Services)                  │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                      Domain Layer                        │
│              (Business Logic, Entities, Ports)           │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                   Infrastructure Layer                   │
│                        (Adapters)                        │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐       │
│  │   Demo     │  │   Turso    │  │   GitHub   │       │
│  │  Adapter   │  │  Adapter   │  │  Adapter   │       │
│  └────────────┘  └────────────┘  └────────────┘       │
└─────────────────────────────────────────────────────────┘
```

## Implementation Plan

### Phase 1: Define Core Interfaces (Ports)

Create interfaces that define what our application needs, regardless of implementation:

```typescript
// lib/core/ports/repository.port.ts
export interface IPullRequestRepository {
  getRecent(orgId: string, limit?: number): Promise<PullRequest[]>
  getByCategory(orgId: string, timeRange?: TimeRange): Promise<CategoryDistribution>
  getTimeSeries(orgId: string, days: number): Promise<TimeSeriesData>
}

// lib/core/ports/metrics.port.ts
export interface IMetricsService {
  getSummary(orgId: string): Promise<MetricsSummary>
  getRecommendations(orgId: string): Promise<Recommendations>
  getTeamPerformance(orgId: string): Promise<TeamPerformance>
}

// lib/core/ports/auth.port.ts
export interface IAuthService {
  getSession(): Promise<Session | null>
  getUserOrganizations(userId: string): Promise<Organization[]>
}
```

### Phase 2: Implement Adapters

Create concrete implementations for each environment:

```typescript
// lib/infrastructure/adapters/demo/pull-request.adapter.ts
export class DemoPullRequestRepository implements IPullRequestRepository {
  private demoData = loadDemoData()
  
  async getRecent(orgId: string, limit = 10): Promise<PullRequest[]> {
    return this.demoData.pullRequests.slice(0, limit)
  }
  
  async getByCategory(orgId: string, timeRange?: TimeRange): Promise<CategoryDistribution> {
    return generateDemoCategoryDistribution(timeRange)
  }
  
  async getTimeSeries(orgId: string, days: number): Promise<TimeSeriesData> {
    return generateDemoTimeSeries(days)
  }
}

// lib/infrastructure/adapters/turso/pull-request.adapter.ts
export class TursoPullRequestRepository implements IPullRequestRepository {
  constructor(private db: TursoClient) {}
  
  async getRecent(orgId: string, limit = 10): Promise<PullRequest[]> {
    return this.db.query(`SELECT * FROM pull_requests WHERE org_id = ? LIMIT ?`, [orgId, limit])
  }
  
  async getByCategory(orgId: string, timeRange?: TimeRange): Promise<CategoryDistribution> {
    // Real database query
  }
  
  async getTimeSeries(orgId: string, days: number): Promise<TimeSeriesData> {
    // Real database query
  }
}
```

### Phase 3: Dependency Injection Container

Create a container that provides the right implementations based on configuration:

```typescript
// lib/core/container.ts
export class DIContainer {
  private static instance: DIContainer
  private services: Map<string, any> = new Map()
  
  static getInstance(): DIContainer {
    if (!DIContainer.instance) {
      DIContainer.instance = new DIContainer()
      DIContainer.instance.initialize()
    }
    return DIContainer.instance
  }
  
  private initialize() {
    const config = this.loadConfiguration()
    
    // Register services based on configuration
    if (config.isDemoMode) {
      this.registerDemoServices()
    } else {
      this.registerProductionServices()
    }
  }
  
  private registerDemoServices() {
    this.services.set('PullRequestRepository', new DemoPullRequestRepository())
    this.services.set('MetricsService', new DemoMetricsService())
    this.services.set('AuthService', new DemoAuthService())
  }
  
  private registerProductionServices() {
    const db = new TursoClient(process.env.TURSO_URL!, process.env.TURSO_TOKEN!)
    this.services.set('PullRequestRepository', new TursoPullRequestRepository(db))
    this.services.set('MetricsService', new TursoMetricsService(db))
    this.services.set('AuthService', new GitHubAuthService())
  }
  
  get<T>(serviceName: string): T {
    return this.services.get(serviceName)
  }
}
```

### Phase 4: Simplify API Routes

API routes become thin controllers that delegate to services:

```typescript
// app/api/pull-requests/recent/route.ts
import { DIContainer } from '@/lib/core/container'
import { IPullRequestRepository } from '@/lib/core/ports'

export async function GET(request: NextRequest) {
  const container = DIContainer.getInstance()
  const prRepository = container.get<IPullRequestRepository>('PullRequestRepository')
  const authService = container.get<IAuthService>('AuthService')
  
  try {
    const session = await authService.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const data = await prRepository.getRecent(session.orgId)
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

### Phase 5: Update Components

Components don't need to know about demo mode:

```typescript
// components/actionable-recommendations.tsx
export function ActionableRecommendations() {
  const [recommendations, setRecommendations] = useState<Recommendations | null>(null)
  
  useEffect(() => {
    // Just fetch data - no knowledge of demo vs production
    fetch('/api/metrics/recommendations')
      .then(res => res.json())
      .then(setRecommendations)
      .catch(console.error)
  }, [])
  
  // Same rendering logic for all modes
  return <div>{/* ... */}</div>
}
```

## Migration Strategy

### Step 1: Create Port Interfaces (Day 1)
- [ ] Define all port interfaces
- [ ] Document expected data structures
- [ ] Create TypeScript types for all entities

### Step 2: Implement Demo Adapters (Day 2)
- [ ] Create demo adapter for each port
- [ ] Move existing demo data generation to adapters
- [ ] Test demo adapters in isolation

### Step 3: Implement Production Adapters (Day 3)
- [ ] Create Turso database adapter
- [ ] Create GitHub API adapter
- [ ] Create NextAuth adapter

### Step 4: Build DI Container (Day 4)
- [ ] Implement container with service registration
- [ ] Add configuration loading
- [ ] Add environment detection

### Step 5: Refactor API Routes (Day 5-6)
- [ ] Update each API route to use DI container
- [ ] Remove all conditional logic
- [ ] Add consistent error handling

### Step 6: Clean Up Components (Day 7)
- [ ] Remove demo mode checks from components
- [ ] Ensure consistent data fetching
- [ ] Update error boundaries

### Step 7: Testing & Documentation (Day 8)
- [ ] Unit tests for adapters
- [ ] Integration tests for API routes
- [ ] Update documentation

## Benefits After Refactoring

1. **Single code path**: No more conditional logic scattered throughout
2. **Easy testing**: Mock adapters for unit tests
3. **Clear boundaries**: Business logic separated from infrastructure
4. **Extensibility**: Easy to add new data sources (e.g., PostgreSQL, Redis)
5. **Maintainability**: Changes to one adapter don't affect others
6. **Type safety**: Interfaces ensure consistent contracts
7. **Performance**: Can optimize each adapter independently
8. **Developer experience**: Clear where to make changes

## File Structure After Refactoring

```
lib/
├── core/
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── pull-request.ts
│   │   │   ├── organization.ts
│   │   │   └── user.ts
│   │   └── value-objects/
│   │       ├── time-range.ts
│   │       └── category.ts
│   ├── ports/
│   │   ├── repository.port.ts
│   │   ├── metrics.port.ts
│   │   ├── auth.port.ts
│   │   └── github.port.ts
│   ├── services/
│   │   ├── metrics.service.ts
│   │   ├── recommendation.service.ts
│   │   └── team.service.ts
│   └── container.ts
├── infrastructure/
│   ├── adapters/
│   │   ├── demo/
│   │   │   ├── pull-request.adapter.ts
│   │   │   ├── metrics.adapter.ts
│   │   │   ├── auth.adapter.ts
│   │   │   └── data/
│   │   │       └── demo-data.json
│   │   ├── turso/
│   │   │   ├── pull-request.adapter.ts
│   │   │   ├── metrics.adapter.ts
│   │   │   └── client.ts
│   │   └── github/
│   │       ├── auth.adapter.ts
│   │       ├── api.adapter.ts
│   │       └── client.ts
│   └── config/
│       ├── environment.ts
│       └── container.config.ts
└── shared/
    ├── errors/
    │   └── domain.errors.ts
    └── utils/
        └── date.utils.ts
```

## Success Metrics

- **Code duplication**: Reduce by 70%
- **Conditional statements**: Reduce by 90%
- **Test coverage**: Increase to 80%
- **API response time**: Maintain or improve
- **Development velocity**: Increase by 40%
- **Bug reports**: Reduce by 60%

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Large refactoring breaking existing features | Incremental migration with feature flags |
| Team learning curve for new architecture | Documentation and pair programming sessions |
| Performance regression | Benchmark before and after each phase |
| Increased initial complexity | Clear documentation and examples |

## Next Steps

1. Review and approve this plan with the team
2. Set up feature flags for gradual rollout
3. Create a new branch for refactoring
4. Start with Phase 1: Port interfaces
5. Daily progress reviews and adjustments

## Conclusion

This refactoring will transform the codebase from a conditional-heavy, tightly-coupled system to a clean, maintainable architecture. The investment in proper architecture will pay dividends in:
- Faster feature development
- Fewer bugs
- Easier onboarding
- Better testability
- Clearer code ownership

The key principle: **Write code once, run it everywhere with different adapters.**
