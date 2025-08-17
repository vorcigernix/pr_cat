/**
 * Demo Auth Service Adapter
 * Implements IAuthService using mock authentication data
 */

import { IAuthService } from '../../../core/ports'
import { User, UserSession } from '../../../core/domain/entities'
import { Organization } from '../../../core/domain/entities'
import { DEMO_USERS, DEMO_ORGANIZATIONS } from './data/demo-data'

export class DemoAuthService implements IAuthService {
  // Store current session in memory for demo
  private currentSession: UserSession | null = null

  async getSession(): Promise<UserSession | null> {
    // In demo mode, always return a demo session
    if (!this.currentSession) {
      this.currentSession = {
        user: DEMO_USERS[0], // Default to first demo user
        organizations: DEMO_ORGANIZATIONS,
        primaryOrganization: DEMO_ORGANIZATIONS[0],
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
      }
    }
    
    return this.currentSession
  }

  async getUser(userId: string): Promise<User | null> {
    return DEMO_USERS.find(user => user.id === userId) || null
  }

  async getUserOrganizations(userId: string): Promise<Organization[]> {
    // In demo mode, all users have access to all demo organizations
    return DEMO_ORGANIZATIONS
  }

  async hasOrganizationAccess(userId: string, organizationId: string): Promise<boolean> {
    // In demo mode, all users have access to all organizations
    const user = DEMO_USERS.find(u => u.id === userId)
    const org = DEMO_ORGANIZATIONS.find(o => o.id === organizationId)
    return Boolean(user && org)
  }

  async ensureUserExists(user: User): Promise<User> {
    // In demo mode, just return the user as-is
    return user
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    const user = DEMO_USERS.find(u => u.id === userId)
    if (!user) {
      throw new Error(`User ${userId} not found`)
    }
    
    // In demo mode, create updated user object (not persistent)
    const updatedUser: User = {
      ...user,
      ...updates,
      updatedAt: new Date()
    }
    
    return updatedUser
  }

  async signOut(): Promise<void> {
    this.currentSession = null
  }

  async getUserWithOrganizations(): Promise<{
    user: User
    organizations: Organization[]
    primaryOrganization: Organization
  }> {
    const session = await this.getSession()
    if (!session) {
      throw new Error('No active session')
    }
    
    return {
      user: session.user,
      organizations: session.organizations,
      primaryOrganization: session.primaryOrganization
    }
  }

  async isAuthenticated(): Promise<boolean> {
    const session = await this.getSession()
    if (!session) return false
    
    // Check if session is not expired
    return new Date() < new Date(session.expires)
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
    const hasAccess = await this.hasOrganizationAccess(userId, organizationId)
    
    if (!hasAccess) {
      return {
        canRead: false,
        canWrite: false,
        canAdmin: false,
        role: 'viewer'
      }
    }

    // In demo mode, give admin permissions to the first user, member to others
    const user = DEMO_USERS.find(u => u.id === userId)
    const isFirstUser = user?.id === DEMO_USERS[0]?.id
    
    if (isFirstUser) {
      return {
        canRead: true,
        canWrite: true,
        canAdmin: true,
        role: 'admin'
      }
    }

    return {
      canRead: true,
      canWrite: true,
      canAdmin: false,
      role: 'member'
    }
  }

  // Demo-specific method to set current user
  setCurrentUser(userId: string): void {
    const user = DEMO_USERS.find(u => u.id === userId)
    if (user) {
      this.currentSession = {
        user,
        organizations: DEMO_ORGANIZATIONS,
        primaryOrganization: DEMO_ORGANIZATIONS[0],
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }
    }
  }
}
