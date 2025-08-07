# Testing Guide for PR Cat

## Overview
This guide documents the testing infrastructure and best practices for PR Cat. We've implemented a comprehensive testing strategy focusing on unit and integration tests for critical functionality.

## Test Setup

### Installation
```bash
# Install testing dependencies (already done)
pnpm add -D jest @testing-library/react @testing-library/jest-dom @testing-library/user-event 
pnpm add -D jest-environment-jsdom @types/jest ts-jest jest-mock-extended
pnpm add -D @swc/jest whatwg-fetch
```

### Running Tests
```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run with coverage
pnpm test:coverage

# Run specific test suites
pnpm test:unit        # Unit tests only
pnpm test:integration # Integration tests only

# Run a specific test file
pnpm test path/to/test.test.ts

# Run tests in CI environment
pnpm test:ci
```

## Test Structure

```
__tests__/
├── fixtures/           # Test data and mocks
│   └── index.ts       # Common test fixtures
├── utils/             # Test utilities
│   └── db-mock.ts     # Database mocking utilities
├── lib/               # Unit tests for lib functions
│   ├── repositories/  # Repository function tests
│   │   └── team-repository.test.ts
│   ├── auth.test.ts   # Authentication tests
│   └── db-performance.test.ts # Performance tests
└── api/               # Integration tests for API routes
    └── teams.test.ts  # Team API endpoints tests
```

## Test Coverage Areas

### ✅ Completed Tests

1. **Team Repository Functions**
   - CRUD operations for teams
   - Team member management
   - Search functionality
   - Batch operations

2. **Authentication & Authorization**
   - User authentication flows
   - Role-based access control
   - Session management
   - Security validations

3. **API Integration Tests**
   - Team management endpoints
   - Input validation
   - Error handling
   - Authorization checks

4. **Performance Tests**
   - N+1 query detection
   - Query optimization validation
   - Batch operation testing
   - Index usage verification

### 🔄 Pending Test Areas

1. **GitHub Integration**
   - Webhook processing
   - GitHub API interactions
   - Installation events

2. **Pull Request Processing**
   - PR categorization
   - Metrics calculation
   - Data synchronization

3. **UI Components**
   - Component rendering
   - User interactions
   - Error boundaries

## Writing Tests

### Unit Test Example
```typescript
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { findTeamById } from '@/lib/repositories/team-repository';
import { mockQuery, resetDbMocks, setupDbMocks } from '../../utils/db-mock';
import { mockTeam } from '../../fixtures';

jest.mock('@/lib/db');

describe('Team Repository', () => {
  beforeEach(() => {
    resetDbMocks();
    setupDbMocks();
  });

  it('should return a team when found', async () => {
    mockQuery.mockResolvedValueOnce([mockTeam]);
    
    const result = await findTeamById(1);
    
    expect(result).toEqual(mockTeam);
    expect(mockQuery).toHaveBeenCalledWith(
      'SELECT * FROM teams WHERE id = ?',
      [1]
    );
  });
});
```

### Integration Test Example
```typescript
import { NextRequest } from 'next/server';
import { GET as getTeams } from '@/app/api/organizations/[orgId]/teams/route';

describe('Team API Routes', () => {
  it('should return teams for an organization', async () => {
    const teams = createMockTeams(3);
    (TeamRepository.getTeamsByOrganizationWithMembers as jest.Mock)
      .mockResolvedValue(teams);

    const request = new NextRequest('http://localhost/api/organizations/1/teams');
    const response = await getTeams(request, { 
      params: Promise.resolve({ orgId: '1' }) 
    });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual(teams);
  });
});
```

## Performance Testing

### N+1 Query Detection
We've implemented tests to detect and prevent N+1 query issues:

```typescript
describe('N+1 Query Detection', () => {
  it('should detect N+1 queries', async () => {
    const teams = createMockTeams(5);
    mockQuery.mockResolvedValueOnce(teams);
    
    // Mock member queries for each team (N+1 problem)
    teams.forEach(() => mockQuery.mockResolvedValueOnce([]));

    await getTeamsByOrganizationWithMembers(1);

    // This reveals the N+1 problem: 1 query + 5 queries
    expect(mockQuery).toHaveBeenCalledTimes(6);
  });
});
```

### Optimized Query Implementation
The optimized version (`team-repository-optimized.ts`) uses single queries with JOINs:

```typescript
export async function getTeamsByOrganizationWithMembersOptimized(
  organizationId: number
): Promise<TeamWithMembers[]> {
  // Single query instead of N+1
  const rows = await query(`
    SELECT t.*, tm.*, u.*
    FROM teams t
    LEFT JOIN team_members tm ON t.id = tm.team_id
    LEFT JOIN users u ON tm.user_id = u.id
    WHERE t.organization_id = ?
    ORDER BY t.name, u.name
  `, [organizationId]);
  
  // Process results in memory
  return groupTeamsWithMembers(rows);
}
```

## Mocking Strategies

### Database Mocking
```typescript
// __tests__/utils/db-mock.ts
export const mockQuery = jest.fn();
export const mockExecute = jest.fn();

export function setupDbMocks() {
  mockQuery.mockResolvedValue([]);
  mockExecute.mockResolvedValue({ 
    lastInsertId: 1, 
    rowsAffected: 1 
  });
}
```

### API Mocking
```typescript
jest.mock('@/auth', () => ({
  auth: jest.fn().mockResolvedValue({
    user: { id: 'user-123', email: 'test@example.com' }
  })
}));
```

## Test Data Fixtures

```typescript
// __tests__/fixtures/index.ts
export const mockUser: User = {
  id: 'user-123',
  name: 'Test User',
  email: 'test@example.com',
  // ...
};

export function createMockTeams(count: number): Team[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `Team ${i + 1}`,
    // ...
  }));
}
```

## Best Practices

### 1. Test Isolation
- Each test should be independent
- Use `beforeEach` to reset mocks
- Don't rely on test execution order

### 2. Meaningful Assertions
```typescript
// Good
expect(result).toEqual(mockTeam);
expect(mockQuery).toHaveBeenCalledWith(
  'SELECT * FROM teams WHERE id = ?',
  [1]
);

// Bad
expect(result).toBeDefined();
expect(mockQuery).toHaveBeenCalled();
```

### 3. Error Testing
```typescript
it('should handle errors gracefully', async () => {
  mockQuery.mockRejectedValueOnce(new Error('Database error'));
  
  await expect(findTeamById(1))
    .rejects
    .toThrow('Database error');
});
```

### 4. Edge Cases
```typescript
it('should handle empty results', async () => {
  mockQuery.mockResolvedValueOnce([]);
  const result = await findTeamsByOrganization(1);
  expect(result).toEqual([]);
});

it('should handle null values', async () => {
  const teamWithNulls = { ...mockTeam, description: null };
  mockQuery.mockResolvedValueOnce([teamWithNulls]);
  const result = await findTeamById(1);
  expect(result.description).toBeNull();
});
```

## Troubleshooting

### Common Issues

1. **Module not found errors**
   - Ensure all imports use the `@/` alias
   - Check that mocks are set up before imports

2. **Database connection in tests**
   - Always mock database functions
   - Never let tests connect to real database

3. **Async test failures**
   - Use `async/await` consistently
   - Ensure promises are resolved/rejected properly

4. **Mock not working**
   - Check mock is defined before module import
   - Verify mock path matches actual module path

### Debug Tips

```typescript
// Log mock calls for debugging
console.log('Mock calls:', mockQuery.mock.calls);

// Check mock implementation
expect(mockQuery).toHaveBeenNthCalledWith(
  1, // First call
  expect.stringContaining('SELECT'),
  expect.any(Array)
);
```

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm test:ci
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

## Next Steps

1. **Increase Coverage**
   - Add tests for GitHub webhook processing
   - Test AI categorization logic
   - Add component tests

2. **Performance Benchmarks**
   - Set up performance regression tests
   - Monitor query execution times
   - Track memory usage

3. **E2E Tests** (Future)
   - Set up Playwright for critical user flows
   - Test authentication flow
   - Test team management UI

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library](https://testing-library.com/docs/)
- [Next.js Testing](https://nextjs.org/docs/app/building-your-application/testing)
- [Mock Service Worker](https://mswjs.io/) (for API mocking)