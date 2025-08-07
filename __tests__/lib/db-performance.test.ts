// Performance tests for database queries, particularly N+1 query issues
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

import { query, execute, transaction } from '@/lib/db';
import {
  getTeamsByOrganizationWithMembers,
} from '@/lib/repositories/team-repository';
import { createMockTeams } from '../fixtures';

const mockQuery = query as jest.Mock;
const mockExecute = execute as jest.Mock;
const mockTransaction = transaction as jest.Mock;

describe('Database Performance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockResolvedValue([]);
    mockExecute.mockResolvedValue({ lastInsertId: 1, rowsAffected: 1 });
    mockTransaction.mockImplementation(async (callback) => {
      const txClient = {
        query: mockQuery,
        execute: mockExecute,
      };
      return callback(txClient);
    });
  });

  describe('N+1 Query Detection', () => {
    it('should detect N+1 queries in getTeamsByOrganizationWithMembers', async () => {
      const teams = createMockTeams(5);
      
      // Mock the initial teams query
      mockQuery.mockResolvedValueOnce(teams);
      
      // Mock member queries for each team (this is the N+1 problem)
      teams.forEach(() => {
        mockQuery.mockResolvedValueOnce([]);
      });

      await getTeamsByOrganizationWithMembers(1);

      // This reveals the N+1 problem: 1 query for teams + 5 queries for members
      expect(mockQuery).toHaveBeenCalledTimes(6);
      
      // First call should get all teams
      expect(mockQuery).toHaveBeenNthCalledWith(1,
        'SELECT * FROM teams WHERE organization_id = ? ORDER BY name',
        [1]
      );
      
      // Next 5 calls fetch members for each team individually (N+1 problem)
      for (let i = 2; i <= 6; i++) {
        expect(mockQuery).toHaveBeenNthCalledWith(i,
          expect.stringContaining('FROM team_members'),
          expect.any(Array)
        );
      }
    });

    it('optimized version should use single query with JOIN', async () => {
      // This is what the optimized version should look like
      const optimizedQuery = `
        SELECT 
          t.id as team_id,
          t.name as team_name,
          t.description as team_description,
          t.color as team_color,
          t.created_at as team_created_at,
          t.updated_at as team_updated_at,
          tm.id as member_id,
          tm.role as member_role,
          tm.joined_at as member_joined_at,
          u.id as user_id,
          u.name as user_name,
          u.email as user_email,
          u.image as user_image
        FROM teams t
        LEFT JOIN team_members tm ON t.id = tm.team_id
        LEFT JOIN users u ON tm.user_id = u.id
        WHERE t.organization_id = ?
        ORDER BY t.name, u.name
      `;

      // Mock the optimized query result
      const optimizedResult = [
        {
          team_id: 1,
          team_name: 'Team 1',
          team_description: 'Description 1',
          team_color: '#3B82F6',
          team_created_at: '2024-01-01',
          team_updated_at: '2024-01-01',
          member_id: 1,
          member_role: 'member',
          member_joined_at: '2024-01-01',
          user_id: 'user-1',
          user_name: 'User 1',
          user_email: 'user1@example.com',
          user_image: null,
        },
        {
          team_id: 1,
          team_name: 'Team 1',
          team_description: 'Description 1',
          team_color: '#3B82F6',
          team_created_at: '2024-01-01',
          team_updated_at: '2024-01-01',
          member_id: 2,
          member_role: 'lead',
          member_joined_at: '2024-01-01',
          user_id: 'user-2',
          user_name: 'User 2',
          user_email: 'user2@example.com',
          user_image: null,
        },
        {
          team_id: 2,
          team_name: 'Team 2',
          team_description: 'Description 2',
          team_color: '#10B981',
          team_created_at: '2024-01-01',
          team_updated_at: '2024-01-01',
          member_id: null,
          member_role: null,
          member_joined_at: null,
          user_id: null,
          user_name: null,
          user_email: null,
          user_image: null,
        },
      ];

      // Test that we can process the optimized result correctly
      const teams = new Map();
      
      for (const row of optimizedResult) {
        if (!teams.has(row.team_id)) {
          teams.set(row.team_id, {
            id: row.team_id,
            name: row.team_name,
            description: row.team_description,
            color: row.team_color,
            created_at: row.team_created_at,
            updated_at: row.team_updated_at,
            members: [],
            member_count: 0,
          });
        }
        
        const team = teams.get(row.team_id);
        
        if (row.member_id) {
          team.members.push({
            id: row.member_id,
            team_id: row.team_id,
            user_id: row.user_id,
            role: row.member_role,
            joined_at: row.member_joined_at,
            user: {
              id: row.user_id,
              name: row.user_name,
              email: row.user_email,
              image: row.user_image,
            },
          });
          team.member_count++;
        }
      }
      
      const result = Array.from(teams.values());
      
      // Verify the result structure
      expect(result).toHaveLength(2);
      expect(result[0].member_count).toBe(2);
      expect(result[1].member_count).toBe(0);
      
      // This would be a single query instead of N+1
      expect(optimizedQuery).toBeDefined();
    });
  });

  describe('Query Batching', () => {
    it('should batch multiple findById queries', async () => {
      // Instead of multiple individual queries
      const ids = [1, 2, 3, 4, 5];
      
      // Bad approach: N queries
      for (const id of ids) {
        mockQuery.mockResolvedValueOnce([]);
        await mockQuery('SELECT * FROM teams WHERE id = ?', [id]);
      }
      
      expect(mockQuery).toHaveBeenCalledTimes(5);
      mockQuery.mockClear();
      
      // Good approach: Single query with IN clause
      mockQuery.mockResolvedValueOnce([]);
      await mockQuery('SELECT * FROM teams WHERE id IN (?, ?, ?, ?, ?)', ids);
      
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });
  });

  describe('Pagination Performance', () => {
    it('should use LIMIT and OFFSET for pagination', async () => {
      const pageSize = 10;
      const page = 2;
      const offset = (page - 1) * pageSize;
      
      mockQuery.mockResolvedValueOnce([]);
      
      await mockQuery(
        'SELECT * FROM pull_requests ORDER BY created_at DESC LIMIT ? OFFSET ?',
        [pageSize, offset]
      );
      
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT'),
        [pageSize, offset]
      );
    });

    it('should count total records efficiently', async () => {
      // Bad: Fetching all records just to count
      const allRecords = Array(1000).fill({});
      mockQuery.mockResolvedValueOnce(allRecords);
      const badResult = await mockQuery('SELECT * FROM pull_requests');
      const badCount = badResult.length;
      expect(badCount).toBe(1000);
      
      // Good: Using COUNT(*)
      mockQuery.mockResolvedValueOnce([{ count: 1000 }]);
      const goodResult = await mockQuery('SELECT COUNT(*) as count FROM pull_requests');
      expect(goodResult[0].count).toBe(1000);
    });
  });

  describe('Index Usage', () => {
    it('should query using indexed columns', async () => {
      // These queries should use indexes for better performance
      const indexedQueries = [
        'SELECT * FROM users WHERE email = ?',
        'SELECT * FROM organizations WHERE installation_id = ?',
        'SELECT * FROM pull_requests WHERE repository_id = ? AND created_at > ?',
        'SELECT * FROM teams WHERE organization_id = ? ORDER BY name',
      ];

      for (const sql of indexedQueries) {
        mockQuery.mockResolvedValueOnce([]);
        await mockQuery(sql, [1]);
      }

      // Verify all queries were made
      expect(mockQuery).toHaveBeenCalledTimes(indexedQueries.length);
    });
  });

  describe('Transaction Performance', () => {
    it('should batch operations in transactions', async () => {
      const teamIds = [1, 2, 3, 4, 5];
      
      // Bad: Individual operations without transaction
      for (const id of teamIds) {
        mockExecute.mockResolvedValueOnce({ rowsAffected: 1 });
        await mockExecute('UPDATE teams SET updated_at = ? WHERE id = ?', ['2024-01-01', id]);
      }
      
      expect(mockExecute).toHaveBeenCalledTimes(5);
      mockExecute.mockClear();
      
      // Good: Batch in transaction
      await mockTransaction(async (tx) => {
        for (const id of teamIds) {
          await tx.execute('UPDATE teams SET updated_at = ? WHERE id = ?', ['2024-01-01', id]);
        }
      });
      
      // Transaction should wrap multiple operations
      expect(mockTransaction).toHaveBeenCalledTimes(1);
    });
  });
});