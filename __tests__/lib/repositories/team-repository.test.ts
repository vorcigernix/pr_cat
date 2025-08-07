// Unit tests for team repository functions
import { describe, it, expect, beforeEach } from '@jest/globals';

// Mock the db module BEFORE importing anything that uses it
jest.mock('@/lib/db', () => ({
  query: jest.fn(),
  execute: jest.fn(),
  transaction: jest.fn(),
  getDbClient: jest.fn(),
  checkDbHealth: jest.fn(),
  getConnectionStatus: jest.fn(() => ({ isConnected: true, hasClient: true })),
}));

import {
  findTeamById,
  findTeamsByOrganization,
  createTeam,
  updateTeam,
  deleteTeam,
  addTeamMember,
  removeTeamMember,
  getTeamMembers,
  getTeamWithMembers,
  getTeamsByOrganizationWithMembers,
  searchUsers,
} from '@/lib/repositories/team-repository';
import { query, execute } from '@/lib/db';
import { mockTeam, mockUser, mockTeamMember, createMockTeams } from '../../fixtures';

// Get references to the mocked functions
const mockQuery = query as jest.Mock;
const mockExecute = execute as jest.Mock;

describe('Team Repository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Setup default mock responses
    mockQuery.mockResolvedValue([]);
    mockExecute.mockResolvedValue({ lastInsertId: 1, rowsAffected: 1 });
  });

  describe('findTeamById', () => {
    it('should return a team when found', async () => {
      mockQuery.mockResolvedValueOnce([mockTeam]);
      
      const result = await findTeamById(1);
      
      expect(result).toEqual(mockTeam);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM teams WHERE id = ?',
        [1]
      );
    });

    it('should return null when team not found', async () => {
      mockQuery.mockResolvedValueOnce([]);
      
      const result = await findTeamById(999);
      
      expect(result).toBeNull();
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM teams WHERE id = ?',
        [999]
      );
    });
  });

  describe('findTeamsByOrganization', () => {
    it('should return teams for an organization', async () => {
      const teams = createMockTeams(3);
      mockQuery.mockResolvedValueOnce(teams);
      
      const result = await findTeamsByOrganization(1);
      
      expect(result).toEqual(teams);
      expect(result).toHaveLength(3);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM teams WHERE organization_id = ? ORDER BY name',
        [1]
      );
    });

    it('should return empty array when no teams found', async () => {
      mockQuery.mockResolvedValueOnce([]);
      
      const result = await findTeamsByOrganization(999);
      
      expect(result).toEqual([]);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM teams WHERE organization_id = ? ORDER BY name',
        [999]
      );
    });
  });

  describe('createTeam', () => {
    it('should create a new team successfully', async () => {
      const newTeam = {
        organization_id: 1,
        name: 'New Team',
        description: 'A new team',
        color: '#10B981',
      };
      
      mockExecute.mockResolvedValueOnce({ lastInsertId: 2, rowsAffected: 1 });
      mockQuery.mockResolvedValueOnce([{ ...mockTeam, ...newTeam, id: 2 }]);
      
      const result = await createTeam(newTeam);
      
      expect(result).toMatchObject(newTeam);
      expect(result.id).toBe(2);
      expect(mockExecute).toHaveBeenCalledWith(
        'INSERT INTO teams (organization_id, name, description, color) VALUES (?, ?, ?, ?)',
        [newTeam.organization_id, newTeam.name, newTeam.description, newTeam.color]
      );
    });

    it('should throw error when creation fails', async () => {
      const newTeam = {
        organization_id: 1,
        name: 'New Team',
        description: null,
        color: null,
      };
      
      mockExecute.mockResolvedValueOnce({ rowsAffected: 0 });
      
      await expect(createTeam(newTeam)).rejects.toThrow('Failed to create team');
    });
  });

  describe('updateTeam', () => {
    it('should update team fields successfully', async () => {
      const updates = {
        name: 'Updated Team Name',
        description: 'Updated description',
      };
      
      mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });
      mockQuery.mockResolvedValueOnce([{ ...mockTeam, ...updates }]);
      
      const result = await updateTeam(1, updates);
      
      expect(result).toMatchObject(updates);
      expect(mockExecute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE teams SET'),
        expect.arrayContaining(['Updated Team Name', 'Updated description', 1])
      );
    });

    it('should return existing team when no updates provided', async () => {
      mockQuery.mockResolvedValueOnce([mockTeam]);
      
      const result = await updateTeam(1, {});
      
      expect(result).toEqual(mockTeam);
      expect(mockExecute).not.toHaveBeenCalled();
    });

    it('should handle undefined values in updates', async () => {
      const updates = {
        name: 'New Name',
        description: undefined,
        color: undefined,
      };
      
      mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });
      mockQuery.mockResolvedValueOnce([{ ...mockTeam, name: 'New Name' }]);
      
      const result = await updateTeam(1, updates);
      
      expect(result?.name).toBe('New Name');
      // Should only update name, not undefined fields
      expect(mockExecute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE teams SET'),
        expect.arrayContaining(['New Name', 1])
      );
    });
  });

  describe('deleteTeam', () => {
    it('should delete team successfully', async () => {
      mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });
      
      const result = await deleteTeam(1);
      
      expect(result).toBe(true);
      expect(mockExecute).toHaveBeenCalledWith(
        'DELETE FROM teams WHERE id = ?',
        [1]
      );
    });

    it('should return false when team not found', async () => {
      mockExecute.mockResolvedValueOnce({ rowsAffected: 0 });
      
      const result = await deleteTeam(999);
      
      expect(result).toBe(false);
    });
  });

  describe('addTeamMember', () => {
    it('should add a team member successfully', async () => {
      const newMember = {
        team_id: 1,
        user_id: 'user-456',
        role: 'member' as const,
        joined_at: '2024-01-01T00:00:00Z',
      };
      
      // First check - member doesn't exist
      mockQuery.mockResolvedValueOnce([]);
      // Insert member
      mockExecute.mockResolvedValueOnce({ lastInsertId: 2, rowsAffected: 1 });
      // Fetch created member
      mockQuery.mockResolvedValueOnce([{ ...mockTeamMember, ...newMember, id: 2 }]);
      
      const result = await addTeamMember(newMember);
      
      expect(result).toMatchObject(newMember);
      expect(result.id).toBe(2);
    });

    it('should throw error when member already exists', async () => {
      const existingMember = {
        team_id: 1,
        user_id: 'user-123',
        role: 'member' as const,
        joined_at: '2024-01-01T00:00:00Z',
      };
      
      // Member already exists
      mockQuery.mockResolvedValueOnce([mockTeamMember]);
      
      await expect(addTeamMember(existingMember)).rejects.toThrow(
        'User is already a member of this team'
      );
    });
  });

  describe('removeTeamMember', () => {
    it('should remove team member successfully', async () => {
      mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });
      
      const result = await removeTeamMember(1, 'user-123');
      
      expect(result).toBe(true);
      expect(mockExecute).toHaveBeenCalledWith(
        'DELETE FROM team_members WHERE team_id = ? AND user_id = ?',
        [1, 'user-123']
      );
    });

    it('should return false when member not found', async () => {
      mockExecute.mockResolvedValueOnce({ rowsAffected: 0 });
      
      const result = await removeTeamMember(1, 'user-999');
      
      expect(result).toBe(false);
    });
  });

  describe('getTeamMembers', () => {
    it('should return team members with user data', async () => {
      const membersWithUsers = [
        {
          ...mockTeamMember,
          user_id: 'user-123',
          user_name: 'Test User',
          user_email: 'test@example.com',
          user_image: 'https://example.com/avatar.jpg',
          user_created_at: '2024-01-01T00:00:00Z',
          user_updated_at: '2024-01-01T00:00:00Z',
        },
      ];
      
      mockQuery.mockResolvedValueOnce(membersWithUsers);
      
      const result = await getTeamMembers(1);
      
      expect(result).toHaveLength(1);
      // The function transforms the raw data to include a user object
      expect(result[0]).toHaveProperty('user_id');
      expect(result[0]).toHaveProperty('user_name');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('FROM team_members tm'),
        [1]
      );
    });
  });

  describe('getTeamWithMembers', () => {
    it('should return team with members and count', async () => {
      // Find team
      mockQuery.mockResolvedValueOnce([mockTeam]);
      // Get members
      mockQuery.mockResolvedValueOnce([
        {
          ...mockTeamMember,
          user: mockUser,
        },
      ]);
      
      const result = await getTeamWithMembers(1);
      
      expect(result).toMatchObject({
        ...mockTeam,
        member_count: 1,
      });
      expect(result?.members).toHaveLength(1);
    });

    it('should return null when team not found', async () => {
      mockQuery.mockResolvedValueOnce([]);
      
      const result = await getTeamWithMembers(999);
      
      expect(result).toBeNull();
    });
  });

  describe('getTeamsByOrganizationWithMembers', () => {
    it('should return all teams with their members', async () => {
      const teams = createMockTeams(2);
      // Get teams
      mockQuery.mockResolvedValueOnce(teams);
      // Get members for team 1
      mockQuery.mockResolvedValueOnce([{ ...mockTeamMember, user: mockUser }]);
      // Get members for team 2
      mockQuery.mockResolvedValueOnce([]);
      
      const result = await getTeamsByOrganizationWithMembers(1);
      
      expect(result).toHaveLength(2);
      expect(result[0].member_count).toBe(1);
      expect(result[1].member_count).toBe(0);
    });
  });

  describe('searchUsers', () => {
    it('should find users by name or email', async () => {
      const users = [mockUser];
      mockQuery.mockResolvedValueOnce(users);
      
      const result = await searchUsers(1, 'test');
      
      expect(result).toEqual(users);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('LOWER(u.name) LIKE LOWER(?)'),
        [1, '%test%', '%test%']
      );
    });

    it('should return empty array when no users match', async () => {
      mockQuery.mockResolvedValueOnce([]);
      
      const result = await searchUsers(1, 'nonexistent');
      
      expect(result).toEqual([]);
    });

    it('should limit results to 20', async () => {
      mockQuery.mockResolvedValueOnce([]);
      const result = await searchUsers(1, 'test');
      
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT 20'),
        expect.any(Array)
      );
    });
  });
});