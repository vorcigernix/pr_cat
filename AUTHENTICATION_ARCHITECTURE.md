# Authentication Architecture Refactoring

## Current Problem

Our authentication is creating tech debt and violates DDD/Hexagonal Architecture:

```typescript
// CURRENT - Mixed concerns in every route
export async function GET(request: NextRequest) {
  const authService = await ServiceLocator.getAuthService();
  const session = await authService.getSession();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // Business logic...
}
```

## Proper DDD/Hexagonal Authentication

### 1. Application Context Pattern
```typescript
// Application layer receives authenticated context
interface ApplicationContext {
  user: AuthenticatedUser
  organizationId: string
  permissions: Permission[]
}

// Domain services are auth-agnostic
class MetricsService {
  getTeamPerformance(context: ApplicationContext, repositoryIds?: string[]) {
    // Pure business logic, no auth concerns
  }
}
```

### 2. Authentication Middleware
```typescript
// Middleware handles auth at application boundary
export async function withAuth<T>(
  handler: (context: ApplicationContext, request: T) => Promise<Response>
): Promise<(request: T) => Promise<Response>> {
  return async (request: T) => {
    const session = await getSession(request);
    if (!session?.user) {
      return new Response('Unauthorized', { status: 401 });
    }
    
    const context: ApplicationContext = {
      user: session.user,
      organizationId: session.primaryOrganization?.id,
      permissions: session.permissions
    };
    
    return handler(context, request);
  };
}
```

### 3. Clean Route Handlers
```typescript
// Routes become pure business logic
const teamPerformanceHandler = async (
  context: ApplicationContext,
  request: NextRequest
) => {
  const metricsService = await ServiceLocator.getMetricsService();
  const data = await metricsService.getTeamPerformance(
    context.organizationId,
    context.user.permissions
  );
  return NextResponse.json(data);
};

export const GET = withAuth(teamPerformanceHandler);
```

## Migration Strategy

### Phase 1: Create Application Context
- Define `ApplicationContext` interface
- Create `withAuth` middleware
- Create context extraction utilities

### Phase 2: Migrate Core Routes
- Start with metrics routes
- Remove auth logic from route handlers
- Pass context to domain services

### Phase 3: Update Domain Services
- Accept `ApplicationContext` instead of raw session
- Remove auth-specific logic from domain layer
- Make services pure business logic

### Phase 4: Clean Infrastructure
- Consolidate auth adapters
- Remove scattered auth imports
- Centralize session management

## Benefits

1. **Single Responsibility**: Routes handle business logic only
2. **Consistency**: All auth handled the same way
3. **Testability**: Easy to test with mock contexts
4. **Clean Architecture**: Proper separation of concerns
5. **Scalability**: Easy to add new auth requirements

## Implementation Priority

This should be our next major refactoring after the current demo mode is stable.
