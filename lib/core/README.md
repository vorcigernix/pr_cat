# Core Architecture

This directory contains the core domain logic and interface definitions for the application, following hexagonal architecture principles.

## Structure

### Domain Layer
- **Entities**: Core business objects that represent the main concepts
- **Value Objects**: Immutable objects defined by their values, not identity

### Application Layer
- **Ports**: Interfaces that define contracts for external services
- **Services**: Business logic that orchestrates between different ports

## Directory Layout

```
lib/core/
├── domain/
│   ├── entities/           # Business entities
│   │   ├── pull-request.ts
│   │   ├── organization.ts
│   │   ├── user.ts
│   │   ├── repository.ts
│   │   ├── metrics.ts
│   │   └── index.ts
│   └── value-objects/      # Value objects
│       ├── time-range.ts
│       ├── category.ts
│       ├── pagination.ts
│       └── index.ts
├── ports/                  # Interface definitions
│   ├── pull-request.port.ts
│   ├── metrics.port.ts
│   ├── auth.port.ts
│   ├── organization.port.ts
│   ├── repository.port.ts
│   ├── github.port.ts
│   └── index.ts
├── services/              # Future: Business logic services
└── index.ts
```

## Key Concepts

### Entities
Entities are objects with identity that represent core business concepts:
- `PullRequest`: Central entity representing a GitHub pull request
- `Organization`: GitHub organization or user account  
- `User`: GitHub user with authentication context
- `Repository`: GitHub repository with tracking metadata
- `Metrics`: Various analytics and performance data

### Value Objects
Value objects are immutable and defined by their values:
- `TimeRange`: Represents a period with validation and helper methods
- `Category`: Pull request categorization with color and description
- `Pagination`: Page-based data access with navigation

### Ports (Interfaces)
Ports define what the application needs without specifying how:
- `IPullRequestRepository`: Pull request data operations
- `IMetricsService`: Analytics and metrics calculations  
- `IAuthService`: Authentication and session management
- `IOrganizationRepository`: Organization data operations
- `IRepository`: Repository data operations
- `IGitHubService`: GitHub API interactions

## Design Principles

1. **Dependency Inversion**: Core domain doesn't depend on infrastructure
2. **Single Responsibility**: Each interface has one clear purpose
3. **Interface Segregation**: Interfaces are focused and minimal
4. **Testability**: All dependencies are injected via interfaces

## Usage Example

```typescript
import { 
  IPullRequestRepository, 
  IMetricsService,
  TimeRange,
  Pagination 
} from '@/lib/core'

class DashboardService {
  constructor(
    private prRepository: IPullRequestRepository,
    private metricsService: IMetricsService
  ) {}

  async getDashboardData(orgId: string) {
    const timeRange = TimeRange.fromPreset('30d')
    const pagination = Pagination.create(1, 10)
    
    const [summary, recent, recommendations] = await Promise.all([
      this.metricsService.getSummary(orgId),
      this.prRepository.getRecent(orgId, pagination),
      this.metricsService.getRecommendations(orgId)
    ])
    
    return { summary, recent, recommendations }
  }
}
```

## Next Steps

The next phases will implement:
1. **Adapters**: Concrete implementations for demo and production
2. **DI Container**: Service registration and configuration
3. **API Integration**: Update routes to use the new architecture
4. **Component Updates**: Remove conditional logic from React components

## Testing

All interfaces are designed to be easily mockable for unit testing:

```typescript
const mockPRRepo: IPullRequestRepository = {
  getRecent: jest.fn(),
  getById: jest.fn(),
  // ... other methods
}

const service = new DashboardService(mockPRRepo, mockMetricsService)
```
