// Integration tests for team API routes
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NextRequest } from 'next/server';

// Mock auth module
jest.mock('@/auth', () => ({
  auth: jest.fn(),
}));

// Mock database module
jest.mock('@/lib/db', () => ({
  query: jest.fn(),
  execute: jest.fn(),
  transaction: jest.fn(),
  getDbClient: jest.fn(),
  checkDbHealth: jest.fn(),
  getConnectionStatus: jest.fn(() => ({ isConnected: true, hasClient: true })),
}));

// Mock repositories
jest.mock('@/lib/repositories/user-repository', () => ({
  getOrganizationRole: jest.fn(),
  findUserById: jest.fn(),
  createUser: jest.fn(),
  updateUser: jest.fn(),
  findUserWithOrganizations: jest.fn(),
}));

jest.mock('@/lib/repositories/team-repository', () => ({
  findTeamsByOrganization: jest.fn(),
  createTeam: jest.fn(),
  updateTeam: jest.fn(),
  deleteTeam: jest.fn(),
  findTeamById: jest.fn(),
  addTeamMember: jest.fn(),
  removeTeamMember: jest.fn(),
  getTeamMembers: jest.fn(),
  searchUsers: jest.fn(),
  getTeamsByOrganizationWithMembers: jest.fn(),
}));

import { GET as getTeams, POST as createTeam } from '@/app/api/organizations/[orgId]/teams/route';
import { GET as getTeam, PUT as updateTeam, DELETE as deleteTeam } from '@/app/api/organizations/[orgId]/teams/[teamId]/route';
import { POST as addMember, DELETE as removeMember } from '@/app/api/organizations/[orgId]/teams/[teamId]/members/route';
import { mockTeam, mockUser, createMockTeams, mockOrganization } from '../fixtures';

const mockSession = {
  user: {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
  },
  organizations: [mockOrganization],
};

describe('Team API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { auth } = require('@/auth');
    const UserRepository = require('@/lib/repositories/user-repository');
    const TeamRepository = require('@/lib/repositories/team-repository');
    
    auth.mockResolvedValue(mockSession);
    UserRepository.getOrganizationRole.mockResolvedValue('admin');
    TeamRepository.findTeamsByOrganization.mockResolvedValue([]);
    TeamRepository.createTeam.mockResolvedValue(mockTeam);
    TeamRepository.updateTeam.mockResolvedValue(mockTeam);
    TeamRepository.deleteTeam.mockResolvedValue(true);
    TeamRepository.findTeamById.mockResolvedValue(mockTeam);
    TeamRepository.addTeamMember.mockResolvedValue({ id: 1, team_id: 1, user_id: 'user-123', role: 'member' });
    TeamRepository.removeTeamMember.mockResolvedValue(true);
  });

  describe('GET /api/organizations/[orgId]/teams', () => {
    it('should return teams for an organization', async () => {
      const teams = createMockTeams(3);
      const TeamRepository = require('@/lib/repositories/team-repository');
      TeamRepository.findTeamsByOrganization.mockResolvedValue(teams);
      
      const request = new NextRequest('http://localhost:3000/api/organizations/1/teams');
      const response = await getTeams(
        request,
        { params: { orgId: '1' } }
      );
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual(teams);
      expect(TeamRepository.findTeamsByOrganization).toHaveBeenCalledWith(1);
    });

    it('should return 401 if user is not authenticated', async () => {
      const { auth } = require('@/auth');
      auth.mockResolvedValue(null);
      
      const request = new NextRequest('http://localhost:3000/api/organizations/1/teams');
      const response = await getTeams(
        request,
        { params: { orgId: '1' } }
      );
      
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Not authenticated');
    });

    it('should return 403 if user is not part of organization', async () => {
      const UserRepository = require('@/lib/repositories/user-repository');
      UserRepository.getOrganizationRole.mockResolvedValue(null);
      
      const request = new NextRequest('http://localhost:3000/api/organizations/1/teams');
      const response = await getTeams(
        request,
        { params: { orgId: '1' } }
      );
      
      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Access denied');
    });

    it('should return 400 for invalid organization ID', async () => {
      const request = new NextRequest('http://localhost:3000/api/organizations/invalid/teams');
      const response = await getTeams(
        request,
        { params: { orgId: 'invalid' } }
      );
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid organization ID');
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
        { params: { orgId: '1' } }
      );
      
      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data).toMatchObject(mockTeam);
      
      const TeamRepository = require('@/lib/repositories/team-repository');
      expect(TeamRepository.createTeam).toHaveBeenCalledWith({
        organization_id: 1,
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
        { params: { orgId: '1' } }
      );
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Team name is required');
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
        { params: { orgId: '1' } }
      );
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid color format');
    });

    it('should handle duplicate team names', async () => {
      const TeamRepository = require('@/lib/repositories/team-repository');
      TeamRepository.createTeam.mockRejectedValue(new Error('UNIQUE constraint failed: teams.name'));
      
      const request = new NextRequest('http://localhost:3000/api/organizations/1/teams', {
        method: 'POST',
        body: JSON.stringify({ name: 'Existing Team' }),
      });
      
      const response = await createTeam(
        request,
        { params: { orgId: '1' } }
      );
      
      expect(response.status).toBe(500);
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
        { params: { orgId: '1', teamId: '1' } }
      );
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toMatchObject(mockTeam);
      
      const TeamRepository = require('@/lib/repositories/team-repository');
      expect(TeamRepository.updateTeam).toHaveBeenCalledWith(1, updates);
    });

    it('should return 404 if team not found', async () => {
      const TeamRepository = require('@/lib/repositories/team-repository');
      TeamRepository.findTeamById.mockResolvedValue(null);
      
      const request = new NextRequest('http://localhost:3000/api/organizations/1/teams/999', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Update' }),
      });
      
      const response = await updateTeam(
        request,
        { params: { orgId: '1', teamId: '999' } }
      );
      
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Team not found');
    });

    it('should verify team belongs to organization', async () => {
      const TeamRepository = require('@/lib/repositories/team-repository');
      TeamRepository.findTeamById.mockResolvedValue({
        ...mockTeam,
        organization_id: 2, // Different org
      });
      
      const request = new NextRequest('http://localhost:3000/api/organizations/1/teams/1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Update' }),
      });
      
      const response = await updateTeam(
        request,
        { params: { orgId: '1', teamId: '1' } }
      );
      
      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/organizations/[orgId]/teams/[teamId]', () => {
    it('should delete a team', async () => {
      const request = new NextRequest('http://localhost:3000/api/organizations/1/teams/1', {
        method: 'DELETE',
      });
      
      const response = await deleteTeam(
        request,
        { params: { orgId: '1', teamId: '1' } }
      );
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      
      const TeamRepository = require('@/lib/repositories/team-repository');
      expect(TeamRepository.deleteTeam).toHaveBeenCalledWith(1);
    });

    it('should return 500 if deletion fails', async () => {
      const TeamRepository = require('@/lib/repositories/team-repository');
      TeamRepository.deleteTeam.mockResolvedValue(false);
      
      const request = new NextRequest('http://localhost:3000/api/organizations/1/teams/1', {
        method: 'DELETE',
      });
      
      const response = await deleteTeam(
        request,
        { params: { orgId: '1', teamId: '1' } }
      );
      
      expect(response.status).toBe(500);
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
        { params: { orgId: '1', teamId: '1' } }
      );
      
      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data).toHaveProperty('id');
      
      const TeamRepository = require('@/lib/repositories/team-repository');
      expect(TeamRepository.addTeamMember).toHaveBeenCalledWith({
        team_id: 1,
        user_id: 'user-456',
        role: 'member',
      });
    });

    it('should verify user is part of organization before adding', async () => {
      const UserRepository = require('@/lib/repositories/user-repository');
      UserRepository.getOrganizationRole.mockImplementation((userId, orgId) => {
        if (userId === 'user-outside-org') return null;
        return 'admin';
      });
      
      const request = new NextRequest('http://localhost:3000/api/organizations/1/teams/1/members', {
        method: 'POST',
        body: JSON.stringify({
          user_id: 'user-outside-org',
          role: 'member',
        }),
      });
      
      const response = await addMember(
        request,
        { params: { orgId: '1', teamId: '1' } }
      );
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('User is not part of this organization');
    });

    it('should handle duplicate member error', async () => {
      const TeamRepository = require('@/lib/repositories/team-repository');
      TeamRepository.addTeamMember.mockRejectedValue(new Error('User is already a member of this team'));
      
      const request = new NextRequest('http://localhost:3000/api/organizations/1/teams/1/members', {
        method: 'POST',
        body: JSON.stringify({
          user_id: 'user-123',
          role: 'member',
        }),
      });
      
      const response = await addMember(
        request,
        { params: { orgId: '1', teamId: '1' } }
      );
      
      expect(response.status).toBe(400);
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
        { params: { orgId: '1', teamId: '1' } }
      );
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      
      const TeamRepository = require('@/lib/repositories/team-repository');
      expect(TeamRepository.removeTeamMember).toHaveBeenCalledWith(1, 'user-123');
    });

    it('should return 400 if user_id is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/organizations/1/teams/1/members', {
        method: 'DELETE',
      });
      
      const response = await removeMember(
        request,
        { params: { orgId: '1', teamId: '1' } }
      );
      
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('User ID is required');
    });

    it('should return 404 if member not found', async () => {
      const TeamRepository = require('@/lib/repositories/team-repository');
      TeamRepository.removeTeamMember.mockResolvedValue(false);
      
      const request = new NextRequest('http://localhost:3000/api/organizations/1/teams/1/members?user_id=user-999', {
        method: 'DELETE',
      });
      
      const response = await removeMember(
        request,
        { params: { orgId: '1', teamId: '1' } }
      );
      
      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Member not found');
    });
  });
});