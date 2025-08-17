/**
 * Authentication Service Port
 * Defines the contract for authentication and session management
 */

import { User, UserSession } from '../domain/entities/user'
import { Organization } from '../domain/entities/organization'

export interface IAuthService {
  /**
   * Get current user session
   */
  getSession(): Promise<UserSession | null>

  /**
   * Get user by ID
   */
  getUser(userId: string): Promise<User | null>

  /**
   * Get user organizations with access permissions
   */
  getUserOrganizations(userId: string): Promise<Organization[]>

  /**
   * Check if user has access to organization
   */
  hasOrganizationAccess(userId: string, organizationId: string): Promise<boolean>

  /**
   * Ensure user exists in database (create if needed)
   */
  ensureUserExists(user: User): Promise<User>

  /**
   * Update user information
   */
  updateUser(userId: string, updates: Partial<User>): Promise<User>

  /**
   * Sign out user
   */
  signOut(): Promise<void>

  /**
   * Get user with primary organization context
   */
  getUserWithOrganizations(): Promise<{
    user: User
    organizations: Organization[]
    primaryOrganization: Organization
  }>

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): Promise<boolean>

  /**
   * Get user permissions for organization
   */
  getUserPermissions(
    userId: string, 
    organizationId: string
  ): Promise<{
    canRead: boolean
    canWrite: boolean
    canAdmin: boolean
    role: 'admin' | 'member' | 'viewer'
  }>
}
