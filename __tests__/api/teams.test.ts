import { beforeEach, describe, expect, it, mock } from 'bun:test';
// Integration tests for team API routes
import { NextRequest, NextResponse } from 'next/server';

// Mock auth module
mock.module('@/auth', () => ({
  auth: mock(),
}));

// Mock DDD auth boundary used by the team list/detail routes
mock.module('@/lib/core', () => {

  return {
    withAuth:
      (
        handler: (
          context: Record<string, unknown>,
          request: unknown
        ) => Promise<Response>
      ) =>
      async (request: unknown) => {
        const { auth } = require('@/auth') as { auth: ReturnType<typeof mock> };
        const session = await auth();

        if (!session?.user?.id) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const primaryOrganization = session.organizations?.[0];

        return handler(
          {
            user: session.user,
            organizationId: String(primaryOrganization?.id ?? ''),
            primaryOrganization,
            organizations: session.organizations ?? [],
            permissions: {
              canRead: true,
              canWrite: true,
              canAdmin: true,
              role: 'admin',
            },
            requestId: 'test-request',
          },
          request
        );
      },
  };
});

mock.module('@/lib/services', () => ({
  TeamService: {
    getOrganizationTeams: mock(),
    createTeam: mock(),
    getTeamWithMembers: mock(),
    updateTeam: mock(),
    addTeamMember: mock(),
  },
}));

mock.module('@/lib/repositories/team-repository', () => ({
  deleteTeam: mock(),
  getTeamMembers: mock(),
  updateTeamMember: mock(),
  removeTeamMember: mock(),
}));

// Mock database module
mock.module('@/lib/db', () => ({
  query: mock(),
  execute: mock(),
  transaction: mock(),
  getDbClient: mock(),
  checkDbHealth: mock(),
  getConnectionStatus: mock(() => ({ isConnected: true, hasClient: true })),
}));

const { TeamService } = await import('@/lib/services');
const TeamRepository = await import('@/lib/repositories/team-repository');
const { GET: getTeams, POST: createTeam } = await import('@/app/api/organizations/[orgId]/teams/route');
const { PUT: updateTeam, DELETE: deleteTeam } = await import('@/app/api/organizations/[orgId]/teams/[teamId]/route');
const { POST: addMember, DELETE: removeMember } = await import('@/app/api/organizations/[orgId]/teams/[teamId]/members/route');

import { mockTeam, createMockTeams, mockOrganization, mockTeamMember, mockUser } from '../fixtures';

const mockTeamService = (TeamService as unknown as { [K in keyof Omit<typeof TeamService, 'prototype'>]: ReturnType<typeof mock> });
const mockTeamRepository = (TeamRepository as { [K in keyof typeof TeamRepository]: ReturnType<typeof mock> });

const mockSession = {
  user: {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
  },
  organizations: [mockOrganization],
};

function serviceError(message: string, statusCode: number, code = 'TEAM_SERVICE_ERROR') {
  const error = new Error(message) as Error & {
    statusCode: number;
    code: string;
  };
  error.name = 'TeamServiceError';
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

describe('Team API Routes', () => {
  beforeEach(() => {
    mock.clearAllMocks();

    const { auth } = require('@/auth');
    auth.mockResolvedValue(mockSession);

    mockTeamService.getOrganizationTeams.mockResolvedValue([]);
    mockTeamService.createTeam.mockResolvedValue(mockTeam);
    mockTeamService.getTeamWithMembers.mockResolvedValue({
      ...mockTeam,
      members: [{ ...mockTeamMember, user: mockUser }],
      member_count: 1,
    });
    mockTeamService.updateTeam.mockResolvedValue(mockTeam);
    mockTeamService.addTeamMember.mockResolvedValue({
      ...mockTeamMember,
      user_id: 'user-456',
    });

    mockTeamRepository.deleteTeam.mockResolvedValue(true);
    mockTeamRepository.getTeamMembers.mockResolvedValue([{ ...mockTeamMember, user: mockUser }]);
    mockTeamRepository.updateTeamMember.mockResolvedValue(mockTeamMember);
    mockTeamRepository.removeTeamMember.mockResolvedValue(true);
  });

  describe('GET /api/organizations/[orgId]/teams', () => {
    it('should return teams for an organization', async () => {
      const teams = createMockTeams(3).map(team => ({
        ...team,
        members: [],
        member_count: 0,
      }));
      mockTeamService.getOrganizationTeams.mockResolvedValue(teams);

      const request = new NextRequest('http://localhost:3000/api/organizations/1/teams');
      const response = await getTeams(
        request,
        { params: Promise.resolve({ orgId: '1' }) }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual(teams);
      expect(mockTeamService.getOrganizationTeams).toHaveBeenCalledWith('user-123', 1);
    });

    it('should return 403 if user is not part of organization', async () => {
      mockTeamService.getOrganizationTeams.mockRejectedValue(
        serviceError('Access denied. User is not part of this organization', 403, 'ACCESS_DENIED')
      );

      const request = new NextRequest('http://localhost:3000/api/organizations/1/teams');
      const response = await getTeams(
        request,
        { params: Promise.resolve({ orgId: '1' }) }
      );

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Access denied. User is not part of this organization');
    });

    it('should return 400 for invalid organization ID', async () => {
      const request = new NextRequest('http://localhost:3000/api/organizations/invalid/teams');
      const response = await getTeams(
        request,
        { params: Promise.resolve({ orgId: 'invalid' }) }
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid organization ID');
      expect(mockTeamService.getOrganizationTeams).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/organizations/[orgId]/teams', () => {
    it('should create a new team', async () => {
      const newTeam = {
        name: 'New Team',
        description: 'A new team',
        color: '#10B981',
      };

      const request = new NextRequest('http://localhost:3000/api/organizations/1/teams', {
        method: 'POST',
        body: JSON.stringify(newTeam),
      });

      const response = await createTeam(
        request,
        { params: Promise.resolve({ orgId: '1' }) }
      );

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data).toMatchObject(mockTeam);
      expect(mockTeamService.createTeam).toHaveBeenCalledWith('user-123', {
        organizationId: 1,
        ...newTeam,
      });
    });

    it('should validate team name is required', async () => {
      const request = new NextRequest('http://localhost:3000/api/organizations/1/teams', {
        method: 'POST',
        body: JSON.stringify({ description: 'Missing name' }),
      });

      const response = await createTeam(
        request,
        { params: Promise.resolve({ orgId: '1' }) }
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Validation failed');
      expect(mockTeamService.createTeam).not.toHaveBeenCalled();
    });

    it('should validate color format', async () => {
      const request = new NextRequest('http://localhost:3000/api/organizations/1/teams', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Team',
          color: 'invalid-color',
        }),
      });

      const response = await createTeam(
        request,
        { params: Promise.resolve({ orgId: '1' }) }
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Validation failed');
      expect(mockTeamService.createTeam).not.toHaveBeenCalled();
    });

    it('should handle duplicate team names', async () => {
      mockTeamService.createTeam.mockRejectedValue(
        serviceError('A team with this name already exists in the organization', 409, 'DUPLICATE_NAME')
      );

      const request = new NextRequest('http://localhost:3000/api/organizations/1/teams', {
        method: 'POST',
        body: JSON.stringify({ name: 'Existing Team' }),
      });

      const response = await createTeam(
        request,
        { params: Promise.resolve({ orgId: '1' }) }
      );

      expect(response.status).toBe(409);
      const data = await response.json();
      expect(data.error).toBe('A team with this name already exists in the organization');
    });
  });

  describe('PUT /api/organizations/[orgId]/teams/[teamId]', () => {
    it('should update a team', async () => {
      const updates = {
        name: 'Updated Team',
        description: 'Updated description',
      };

      const request = new NextRequest('http://localhost:3000/api/organizations/1/teams/1', {
        method: 'PUT',
        body: JSON.stringify(updates),
      });

      const response = await updateTeam(
        request,
        { params: Promise.resolve({ orgId: '1', teamId: '1' }) }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toMatchObject(mockTeam);
      expect(mockTeamService.updateTeam).toHaveBeenCalledWith('user-123', 1, 1, updates);
    });

    it('should return 404 if team not found', async () => {
      mockTeamService.updateTeam.mockRejectedValue(
        serviceError('Team not found', 404, 'TEAM_NOT_FOUND')
      );

      const request = new NextRequest('http://localhost:3000/api/organizations/1/teams/999', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Update' }),
      });

      const response = await updateTeam(
        request,
        { params: Promise.resolve({ orgId: '1', teamId: '999' }) }
      );

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Team not found');
    });

    it('should return 400 for invalid IDs', async () => {
      const request = new NextRequest('http://localhost:3000/api/organizations/invalid/teams/1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Update' }),
      });

      const response = await updateTeam(
        request,
        { params: Promise.resolve({ orgId: 'invalid', teamId: '1' }) }
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid organization or team ID');
      expect(mockTeamService.updateTeam).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /api/organizations/[orgId]/teams/[teamId]', () => {
    it('should delete a team', async () => {
      const request = new NextRequest('http://localhost:3000/api/organizations/1/teams/1', {
        method: 'DELETE',
      });

      const response = await deleteTeam(
        request,
        { params: Promise.resolve({ orgId: '1', teamId: '1' }) }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toBe('Team deleted successfully');
      expect(mockTeamService.getTeamWithMembers).toHaveBeenCalledWith('user-123', 1, 1);
      expect(mockTeamRepository.deleteTeam).toHaveBeenCalledWith(1);
    });

    it('should return 404 if deletion fails', async () => {
      mockTeamRepository.deleteTeam.mockResolvedValue(false);

      const request = new NextRequest('http://localhost:3000/api/organizations/1/teams/1', {
        method: 'DELETE',
      });

      const response = await deleteTeam(
        request,
        { params: Promise.resolve({ orgId: '1', teamId: '1' }) }
      );

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Failed to delete team');
    });
  });

  describe('POST /api/organizations/[orgId]/teams/[teamId]/members', () => {
    it('should add a member to a team', async () => {
      const request = new NextRequest('http://localhost:3000/api/organizations/1/teams/1/members', {
        method: 'POST',
        body: JSON.stringify({
          user_id: 'user-456',
          role: 'member',
        }),
      });

      const response = await addMember(
        request,
        { params: Promise.resolve({ orgId: '1', teamId: '1' }) }
      );

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data).toHaveProperty('id');
      expect(mockTeamService.getTeamWithMembers).toHaveBeenCalledWith('user-123', 1, 1);
      expect(mockTeamService.addTeamMember).toHaveBeenCalledWith('user-123', 1, 1, {
        userId: 'user-456',
        role: 'member',
      });
    });

    it('should verify user is part of organization before adding', async () => {
      mockTeamService.addTeamMember.mockRejectedValue(
        serviceError('User is not part of this organization', 400, 'USER_NOT_IN_ORGANIZATION')
      );

      const request = new NextRequest('http://localhost:3000/api/organizations/1/teams/1/members', {
        method: 'POST',
        body: JSON.stringify({
          user_id: 'user-outside-org',
          role: 'member',
        }),
      });

      const response = await addMember(
        request,
        { params: Promise.resolve({ orgId: '1', teamId: '1' }) }
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('User is not part of this organization');
    });

    it('should handle duplicate member error', async () => {
      mockTeamService.addTeamMember.mockRejectedValue(
        serviceError('User is already a member of this team', 409, 'ALREADY_MEMBER')
      );

      const request = new NextRequest('http://localhost:3000/api/organizations/1/teams/1/members', {
        method: 'POST',
        body: JSON.stringify({
          user_id: 'user-123',
          role: 'member',
        }),
      });

      const response = await addMember(
        request,
        { params: Promise.resolve({ orgId: '1', teamId: '1' }) }
      );

      expect(response.status).toBe(409);
      const data = await response.json();
      expect(data.error).toContain('already a member');
    });
  });

  describe('DELETE /api/organizations/[orgId]/teams/[teamId]/members', () => {
    it('should remove a member from a team', async () => {
      const request = new NextRequest('http://localhost:3000/api/organizations/1/teams/1/members?user_id=user-123', {
        method: 'DELETE',
      });

      const response = await removeMember(
        request,
        { params: Promise.resolve({ orgId: '1', teamId: '1' }) }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toBe('Team member removed successfully');
      expect(mockTeamService.getTeamWithMembers).toHaveBeenCalledWith('user-123', 1, 1);
      expect(mockTeamRepository.removeTeamMember).toHaveBeenCalledWith(1, 'user-123');
    });

    it('should return 400 if user_id is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/organizations/1/teams/1/members', {
        method: 'DELETE',
      });

      const response = await removeMember(
        request,
        { params: Promise.resolve({ orgId: '1', teamId: '1' }) }
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('User ID is required');
      expect(mockTeamRepository.removeTeamMember).not.toHaveBeenCalled();
    });

    it('should return 404 if member not found', async () => {
      mockTeamRepository.removeTeamMember.mockResolvedValue(false);

      const request = new NextRequest('http://localhost:3000/api/organizations/1/teams/1/members?user_id=user-999', {
        method: 'DELETE',
      });

      const response = await removeMember(
        request,
        { params: Promise.resolve({ orgId: '1', teamId: '1' }) }
      );

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Team member not found');
    });
  });
});
