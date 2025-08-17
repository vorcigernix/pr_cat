# Infrastructure Layer

This directory contains the concrete implementations (adapters) of the port interfaces defined in the core architecture layer.

## Structure

### Demo Adapters
Located in `adapters/demo/`, these provide mock implementations for development and demo purposes:

- **DemoPullRequestRepository**: Mock PR data and operations
- **DemoMetricsService**: Generated analytics and performance data
- **DemoAuthService**: Mock authentication with demo users
- **DemoOrganizationRepository**: Demo organization management
- **DemoRepository**: Mock repository operations
- **DemoGitHubService**: Simulated GitHub API responses

### Demo Data
The `adapters/demo/data/demo-data.ts` file contains:
- Static demo users, organizations, and repositories
- Mock pull request data with realistic attributes
- Generated metrics and recommendations
- Time series data generators for charts

## Key Features

### Realistic Demo Data
- **4 Demo Users**: Alice, Bob, Carol, and David with different roles
- **1 Demo Organization**: "Example Corp" with GitHub App installed
- **3 Demo Repositories**: Frontend, API server, and mobile app
- **5+ Demo Pull Requests**: Mix of features, bug fixes, and documentation
- **6 PR Categories**: Feature Development, Bug Fixes, Tech Debt, etc.

### Dynamic Data Generation
- **Time Series**: Generates realistic activity patterns with weekday/weekend variation
- **Category Distribution**: Proportional PR categorization over time
- **Repository Metrics**: Consistent but varied performance indicators
- **Team Performance**: Individual developer statistics and trends

## Usage Example

```typescript
import {
  DemoPullRequestRepository,
  DemoMetricsService,
  DemoAuthService
} from '@/lib/infrastructure'

// These adapters implement the same interfaces as production adapters
const prRepo = new DemoPullRequestRepository()
const metricsService = new DemoMetricsService()
const authService = new DemoAuthService()

// Use identical API calls
const recentPRs = await prRepo.getRecent('demo-org-1')
const summary = await metricsService.getSummary('demo-org-1')
const session = await authService.getSession()
```

## Benefits

1. **Zero Configuration**: Works without any external dependencies
2. **Consistent Data**: Same demo data across all environments
3. **Realistic Patterns**: Data mimics real-world usage patterns
4. **Full Feature Coverage**: All core features work in demo mode
5. **Fast Development**: No database or API setup required

## Next Steps

Future infrastructure will include:
- **Production Adapters**: Real Turso database and GitHub API implementations
- **Dependency Injection**: Container for service registration and configuration
- **Environment Detection**: Automatic adapter selection based on configuration
- **Caching Layer**: Redis or in-memory caching adapters
- **Monitoring**: Logging and metrics collection adapters
