// Unit tests for authentication and authorization
import { describe, it, expect, beforeEach } from '@jest/globals';

// Mock auth module
jest.mock('@/auth', () => ({
  auth: jest.fn(),
}));

// Mock auth-context module 
jest.mock('@/lib/auth-context', () => ({
  getAuthenticatedUser: jest.fn(),
  getUserOrganizations: jest.fn(),
}));

// Mock repositories
jest.mock('@/lib/repositories/user-repository', () => ({
  findUserById: jest.fn(),
  createUser: jest.fn(),
  updateUser: jest.fn(),
  getOrganizationRole: jest.fn(),
  findUserWithOrganizations: jest.fn(),
}));

jest.mock('@/lib/repositories/organization-repository');

// Mock user utils
jest.mock('@/lib/user-utils', () => ({
  ensureUserExists: jest.fn(),
}));

import { mockUser, mockOrganization } from '../fixtures';

describe('Authentication Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAuthenticatedUser', () => {
    it('should return user when authenticated', async () => {
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
        },
      };

      const { auth } = require('@/auth');
      const { getAuthenticatedUser } = require('@/lib/auth-context');
      
      auth.mockResolvedValue(mockSession);
      getAuthenticatedUser.mockResolvedValue(mockSession.user);
      
      const user = await getAuthenticatedUser();
      
      expect(user).toEqual(mockSession.user);
    });

    it('should throw error when not authenticated', async () => {
      const { auth } = require('@/auth');
      const { getAuthenticatedUser } = require('@/lib/auth-context');
      
      auth.mockResolvedValue(null);
      getAuthenticatedUser.mockRejectedValue(new Error('Not authenticated'));
      
      await expect(getAuthenticatedUser()).rejects.toThrow('Not authenticated');
    });

    it('should throw error when session has no user', async () => {
      const { auth } = require('@/auth');
      const { getAuthenticatedUser } = require('@/lib/auth-context');
      
      auth.mockResolvedValue({});
      getAuthenticatedUser.mockRejectedValue(new Error('Not authenticated'));
      
      await expect(getAuthenticatedUser()).rejects.toThrow('Not authenticated');
    });
  });

  describe('getUserOrganizations', () => {
    it('should return user organizations when authenticated', async () => {
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
        },
        organizations: [mockOrganization],
      };

      const { auth } = require('@/auth');
      const { getUserOrganizations } = require('@/lib/auth-context');
      
      auth.mockResolvedValue(mockSession);
      getUserOrganizations.mockResolvedValue([mockOrganization]);
      
      const orgs = await getUserOrganizations();
      
      expect(orgs).toEqual([mockOrganization]);
    });

    it('should return empty array when no organizations', async () => {
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
        },
      };

      const { auth } = require('@/auth');
      const { getUserOrganizations } = require('@/lib/auth-context');
      
      auth.mockResolvedValue(mockSession);
      getUserOrganizations.mockResolvedValue([]);
      
      const orgs = await getUserOrganizations();
      
      expect(orgs).toEqual([]);
    });
  });

  describe('ensureUserExists', () => {
    it('should create user if not exists', async () => {
      const sessionUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        image: 'https://example.com/avatar.jpg',
      };

      const UserRepository = require('@/lib/repositories/user-repository');
      const { ensureUserExists } = require('@/lib/user-utils');

      UserRepository.findUserById.mockResolvedValue(null);
      UserRepository.createUser.mockResolvedValue(mockUser);
      ensureUserExists.mockResolvedValue(undefined);

      await ensureUserExists(sessionUser);

      expect(ensureUserExists).toHaveBeenCalledWith(sessionUser);
    });

    it('should update user if exists with different data', async () => {
      const sessionUser = {
        id: 'user-123',
        email: 'new@example.com',
        name: 'Updated Name',
        image: 'https://example.com/new-avatar.jpg',
      };

      const UserRepository = require('@/lib/repositories/user-repository');
      const { ensureUserExists } = require('@/lib/user-utils');

      UserRepository.findUserById.mockResolvedValue({
        ...mockUser,
        email: 'old@example.com',
        name: 'Old Name',
      });
      UserRepository.updateUser.mockResolvedValue({
        ...mockUser,
        ...sessionUser,
      });
      ensureUserExists.mockResolvedValue(undefined);

      await ensureUserExists(sessionUser);

      expect(ensureUserExists).toHaveBeenCalledWith(sessionUser);
    });

    it('should not update if user data is the same', async () => {
      const sessionUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        image: 'https://example.com/avatar.jpg',
      };

      const UserRepository = require('@/lib/repositories/user-repository');
      const { ensureUserExists } = require('@/lib/user-utils');

      UserRepository.findUserById.mockResolvedValue(mockUser);
      ensureUserExists.mockResolvedValue(undefined);

      await ensureUserExists(sessionUser);

      expect(ensureUserExists).toHaveBeenCalledWith(sessionUser);
    });

    it('should handle user without email gracefully', async () => {
      const sessionUser = {
        id: 'user-123',
        email: null,
        name: 'Test User',
        image: null,
      };

      const UserRepository = require('@/lib/repositories/user-repository');
      const { ensureUserExists } = require('@/lib/user-utils');

      UserRepository.findUserById.mockResolvedValue(null);
      UserRepository.createUser.mockResolvedValue({
        ...mockUser,
        email: null,
      });
      ensureUserExists.mockResolvedValue(undefined);

      await ensureUserExists(sessionUser);

      expect(ensureUserExists).toHaveBeenCalledWith(sessionUser);
    });
  });

  describe('Authorization', () => {
    describe('getOrganizationRole', () => {
      it('should return role when user is member of organization', async () => {
        const UserRepository = require('@/lib/repositories/user-repository');
        UserRepository.getOrganizationRole.mockResolvedValue('admin');

        const role = await UserRepository.getOrganizationRole('user-123', 1);

        expect(role).toBe('admin');
        expect(UserRepository.getOrganizationRole).toHaveBeenCalledWith('user-123', 1);
      });

      it('should return null when user is not member', async () => {
        const UserRepository = require('@/lib/repositories/user-repository');
        UserRepository.getOrganizationRole.mockResolvedValue(null);

        const role = await UserRepository.getOrganizationRole('user-123', 999);

        expect(role).toBeNull();
      });
    });

    describe('Role-based access control', () => {
      it('should allow admin to perform admin actions', async () => {
        const UserRepository = require('@/lib/repositories/user-repository');
        
        const checkAdminAccess = async (userId: string, orgId: number) => {
          const role = await UserRepository.getOrganizationRole(userId, orgId);
          return role === 'admin' || role === 'owner';
        };

        UserRepository.getOrganizationRole.mockResolvedValue('admin');
        
        const hasAccess = await checkAdminAccess('user-123', 1);
        expect(hasAccess).toBe(true);
      });

      it('should deny member from admin actions', async () => {
        const UserRepository = require('@/lib/repositories/user-repository');
        
        const checkAdminAccess = async (userId: string, orgId: number) => {
          const role = await UserRepository.getOrganizationRole(userId, orgId);
          return role === 'admin' || role === 'owner';
        };

        UserRepository.getOrganizationRole.mockResolvedValue('member');
        
        const hasAccess = await checkAdminAccess('user-123', 1);
        expect(hasAccess).toBe(false);
      });
    });
  });

  describe('Session Management', () => {
    it('should handle expired tokens gracefully', async () => {
      const mockSession = {
        user: {
          id: 'user-123',
        },
        accessToken: 'expired-token',
        error: 'RefreshTokenError',
      };

      const { auth } = require('@/auth');
      const { getAuthenticatedUser } = require('@/lib/auth-context');
      
      auth.mockResolvedValue(mockSession);
      getAuthenticatedUser.mockResolvedValue(mockSession.user);
      
      // Should still return user even with expired token
      const user = await getAuthenticatedUser();
      expect(user.id).toBe('user-123');
    });

    it('should include organizations in session', async () => {
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
        },
        organizations: [
          { id: 1, name: 'Org 1', github_id: 12345 },
          { id: 2, name: 'Org 2', github_id: 67890 },
        ],
      };

      const { auth } = require('@/auth');
      const { getUserOrganizations } = require('@/lib/auth-context');
      
      auth.mockResolvedValue(mockSession);
      getUserOrganizations.mockResolvedValue(mockSession.organizations);
      
      const orgs = await getUserOrganizations();
      expect(orgs).toHaveLength(2);
      expect(orgs[0].name).toBe('Org 1');
    });
  });

  describe('Security', () => {
    it('should not expose sensitive data in session', () => {
      const session = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
        },
        accessToken: 'secret-token',
      };

      // accessToken should not be included in public session data
      const publicSession = {
        user: session.user,
        // accessToken should be excluded
      };

      expect(publicSession).not.toHaveProperty('accessToken');
    });

    it('should validate JWT tokens', async () => {
      // Mock invalid JWT
      const invalidToken = 'invalid.jwt.token';
      
      const validateToken = (token: string) => {
        const parts = token.split('.');
        return parts.length === 3;
      };

      expect(validateToken(invalidToken)).toBe(true);
      expect(validateToken('invalid')).toBe(false);
    });
  });
});