/**
 * Turso Auth Service Adapter
 * Implements IAuthService using NextAuth and real database operations
 */

import { IAuthService } from '../../../core/ports'
import { User, UserSession } from '../../../core/domain/entities'
import { Organization } from '../../../core/domain/entities'
import { auth } from '@/auth'
import { query, execute } from '@/lib/db'
import * as UserRepository from '@/lib/repositories/user-repository'
import * as OrganizationRepository from '@/lib/repositories/organization-repository'
import { mapDbUserToDomain, mapDbOrganizationToDomain } from './mappers'
import * as DbTypes from '@/lib/types'

export class TursoAuthService implements IAuthService {

  async getSession(): Promise<UserSession | null> {
    const session = await auth()
    
    if (!session?.user?.id) {
      return null
    }

    try {
      // Get user from database
      const dbUser = await UserRepository.findUserById(session.user.id)
      if (!dbUser) {
        return null
      }

      // Get user's organizations
      const organizations = await this.getUserOrganizations(session.user.id)
      
      if (organizations.length === 0) {
        return null
      }

      // Convert to domain entities
      const user = mapDbUserToDomain(dbUser)
      const primaryOrganization = organizations[0] // Use first org as primary

      return {
        user: {
          ...user,
          isNewUser: this.isNewUser(dbUser),
          hasGithubApp: organizations.some(org => org.isInstalled)
        },
        organizations,
        primaryOrganization,
        accessToken: session.accessToken,
        expires: new Date(session.expires)
      }
    } catch (error) {
      console.error('Error getting session:', error)
      return null
    }
  }

  async getUser(userId: string): Promise<User | null> {
    try {
      const dbUser = await UserRepository.findUserById(userId)
      if (!dbUser) return null

      return {
        ...mapDbUserToDomain(dbUser),
        isNewUser: this.isNewUser(dbUser),
        hasGithubApp: await this.userHasGitHubApp(userId)
      }
    } catch (error) {
      console.error('Error getting user:', error)
      return null
    }
  }

  async getUserOrganizations(userId: string): Promise<Organization[]> {
    try {
      const dbOrganizations = await OrganizationRepository.getUserOrganizationsWithRole(userId)
      return dbOrganizations.map(org => mapDbOrganizationToDomain(org))
    } catch (error) {
      console.error('Error getting user organizations:', error)
      return []
    }
  }

  async hasOrganizationAccess(userId: string, organizationId: string): Promise<boolean> {
    try {
      const orgId = parseInt(organizationId)
      const userOrgs = await query<{ organization_id: number }>(`
        SELECT organization_id
        FROM user_organizations
        WHERE user_id = ? AND organization_id = ?
      `, [userId, orgId])

      return userOrgs.length > 0
    } catch (error) {
      console.error('Error checking organization access:', error)
      return false
    }
  }

  async ensureUserExists(user: User): Promise<User> {
    try {
      // Check if user already exists
      let dbUser = await UserRepository.findUserById(user.id)
      
      if (!dbUser) {
        // Create new user
        dbUser = await UserRepository.createUser({
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.avatarUrl
        })
      } else {
        // Update existing user
        dbUser = await UserRepository.updateUser(user.id, {
          name: user.name,
          email: user.email,
          image: user.avatarUrl
        }) || dbUser
      }

      return {
        ...mapDbUserToDomain(dbUser),
        isNewUser: this.isNewUser(dbUser),
        hasGithubApp: await this.userHasGitHubApp(user.id)
      }
    } catch (error) {
      console.error('Error ensuring user exists:', error)
      throw new Error('Failed to ensure user exists')
    }
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    try {
      const dbUpdates: Partial<DbTypes.User> = {}
      
      if (updates.name !== undefined) dbUpdates.name = updates.name
      if (updates.email !== undefined) dbUpdates.email = updates.email
      if (updates.avatarUrl !== undefined) dbUpdates.image = updates.avatarUrl

      const updatedDbUser = await UserRepository.updateUser(userId, dbUpdates)
      
      if (!updatedDbUser) {
        throw new Error('Failed to update user')
      }

      return {
        ...mapDbUserToDomain(updatedDbUser),
        isNewUser: this.isNewUser(updatedDbUser),
        hasGithubApp: await this.userHasGitHubApp(userId)
      }
    } catch (error) {
      console.error('Error updating user:', error)
      throw new Error('Failed to update user')
    }
  }

  async signOut(): Promise<void> {
    // NextAuth handles sign out, nothing to do here for database
    // The NextAuth signOut function will be called from the client
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
    return session !== null && new Date() < session.expires
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
    try {
      const orgId = parseInt(organizationId)
      const userOrgRole = await query<{ role: string }>(`
        SELECT role
        FROM user_organizations
        WHERE user_id = ? AND organization_id = ?
      `, [userId, orgId])

      if (userOrgRole.length === 0) {
        return {
          canRead: false,
          canWrite: false,
          canAdmin: false,
          role: 'viewer'
        }
      }

      const role = userOrgRole[0].role as 'admin' | 'member' | 'owner'
      
      switch (role) {
        case 'owner':
        case 'admin':
          return {
            canRead: true,
            canWrite: true,
            canAdmin: true,
            role: 'admin'
          }
        case 'member':
          return {
            canRead: true,
            canWrite: true,
            canAdmin: false,
            role: 'member'
          }
        default:
          return {
            canRead: true,
            canWrite: false,
            canAdmin: false,
            role: 'viewer'
          }
      }
    } catch (error) {
      console.error('Error getting user permissions:', error)
      return {
        canRead: false,
        canWrite: false,
        canAdmin: false,
        role: 'viewer'
      }
    }
  }

  // Helper methods
  private isNewUser(dbUser: DbTypes.User): boolean {
    const createdAt = new Date(dbUser.created_at)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    return createdAt > oneDayAgo
  }

  private async userHasGitHubApp(userId: string): Promise<boolean> {
    try {
      const orgs = await OrganizationRepository.getUserOrganizationsWithRole(userId)
      return orgs.some(org => Boolean(org.installation_id))
    } catch (error) {
      console.error('Error checking GitHub app:', error)
      return false
    }
  }
}
