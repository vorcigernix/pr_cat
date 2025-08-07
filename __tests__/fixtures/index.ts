// Test fixtures for common data structures
import { User, Organization, Team, TeamMember, Repository, PullRequest, Category } from '@/lib/types';

export const mockUser: User = {
  id: 'user-123',
  name: 'Test User',
  email: 'test@example.com',
  image: 'https://example.com/avatar.jpg',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

export const mockOrganization: Organization = {
  id: 1,
  github_id: 12345,
  name: 'test-org',
  avatar_url: 'https://example.com/org-avatar.jpg',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  installation_id: 67890,
};

export const mockTeam: Team = {
  id: 1,
  organization_id: 1,
  name: 'Engineering Team',
  description: 'Core engineering team',
  color: '#3B82F6',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

export const mockTeamMember: TeamMember = {
  id: 1,
  team_id: 1,
  user_id: 'user-123',
  role: 'member',
  joined_at: '2024-01-01T00:00:00Z',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

export const mockRepository: Repository = {
  id: 1,
  github_id: 98765,
  organization_id: 1,
  name: 'test-repo',
  full_name: 'test-org/test-repo',
  description: 'Test repository',
  private: false,
  is_tracked: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

export const mockPullRequest: PullRequest = {
  id: 1,
  github_id: 11111,
  repository_id: 1,
  number: 42,
  title: 'Test PR',
  description: 'This is a test pull request',
  author_id: 'user-123',
  state: 'open',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  closed_at: null,
  merged_at: null,
  draft: false,
  additions: 100,
  deletions: 50,
  changed_files: 5,
  category_id: 1,
  category_confidence: 0.95,
  embedding_id: null,
};

export const mockCategory: Category = {
  id: 1,
  organization_id: 1,
  name: 'Bug Fixes',
  description: 'Fixing issues and bugs',
  color: '#F87171',
  is_default: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

// Helper to create multiple mock items
export function createMockUsers(count: number): User[] {
  return Array.from({ length: count }, (_, i) => ({
    ...mockUser,
    id: `user-${i}`,
    name: `User ${i}`,
    email: `user${i}@example.com`,
  }));
}

export function createMockTeams(count: number, orgId: number = 1): Team[] {
  return Array.from({ length: count }, (_, i) => ({
    ...mockTeam,
    id: i + 1,
    organization_id: orgId,
    name: `Team ${i + 1}`,
  }));
}

export function createMockPullRequests(count: number, repoId: number = 1): PullRequest[] {
  return Array.from({ length: count }, (_, i) => ({
    ...mockPullRequest,
    id: i + 1,
    number: i + 1,
    repository_id: repoId,
    title: `PR #${i + 1}`,
  }));
}