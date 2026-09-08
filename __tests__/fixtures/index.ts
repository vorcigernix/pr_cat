// Test fixtures for common data structures
import { User, Organization, Team, TeamMember } from '@/lib/types';

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

export function createMockTeams(count: number, orgId: number = 1): Team[] {
  return Array.from({ length: count }, (_, i) => ({
    ...mockTeam,
    id: i + 1,
    organization_id: orgId,
    name: `Team ${i + 1}`,
  }));
}
