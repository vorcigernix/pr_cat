/**
 * Simplified Turso Auth Service Adapter
 * Implements IAuthService with basic NextAuth integration
 */

import { IAuthService } from '../../../core/ports'
import { User, UserSession, Organization } from '../../../core/domain/entities'

// Use demo adapter as base for now
import { DemoAuthService } from '../demo/auth.adapter'

export class SimpleTursoAuthService implements IAuthService {
  private demoFallback = new DemoAuthService()

  async getSession(): Promise<UserSession | null> {
    // In production, would check real NextAuth session
    // For now, use demo session
    return this.demoFallback.getSession()
  }

  async getUser(userId: string): Promise<User | null> {
    return this.demoFallback.getUser(userId)
  }

  async getUserOrganizations(userId: string): Promise<Organization[]> {
    return this.demoFallback.getUserOrganizations(userId)
  }

  async hasOrganizationAccess(userId: string, organizationId: string): Promise<boolean> {
    return this.demoFallback.hasOrganizationAccess(userId, organizationId)
  }

  async ensureUserExists(user: User): Promise<User> {
    return this.demoFallback.ensureUserExists(user)
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    return this.demoFallback.updateUser(userId, updates)
  }

  async signOut(): Promise<void> {
    return this.demoFallback.signOut()
  }

  async getUserWithOrganizations(): Promise<{
    user: User
    organizations: Organization[]
    primaryOrganization: Organization
  }> {
    return this.demoFallback.getUserWithOrganizations()
  }

  async isAuthenticated(): Promise<boolean> {
    return this.demoFallback.isAuthenticated()
  }

  async getUserPermissions(
    userId: string, 
    organizationId: string
  ): Promise<{
    canRead: boolean
    canWrite: boolean
    canAdmin: boolean
    role: 'admin' | 'member' | 'viewer'
  }> {
    return this.demoFallback.getUserPermissions(userId, organizationId)
  }
}
