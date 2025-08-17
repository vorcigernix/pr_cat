/**
 * Turso Organization Repository Adapter
 * Implements IOrganizationRepository using real database operations
 */

import { IOrganizationRepository } from '../../../core/ports'
import { 
  Organization, 
  OrganizationMember, 
  OrganizationSettings, 
  OrganizationMetrics 
} from '../../../core/domain/entities'
import { Repository } from '../../../core/domain/entities'
import { Category } from '../../../core/domain/value-objects'
import { Pagination, PaginatedResult } from '../../../core/domain/value-objects'
import { query, execute } from '@/lib/db'
import * as OrganizationRepository from '@/lib/repositories/organization-repository'
import * as RepositoryRepository from '@/lib/repositories/repository-repository'
import * as CategoryRepository from '@/lib/repositories/category-repository'
import { 
  mapDbOrganizationToDomain, 
  mapDbUserToDomain, 
  mapDbRepositoryToDomain,
  mapDbCategoryToDomain
} from './mappers'
import * as DbTypes from '@/lib/types'

export class TursoOrganizationRepository implements IOrganizationRepository {
  
  async getById(organizationId: string): Promise<Organization | null> {
    try {
      const dbOrg = await OrganizationRepository.findOrganizationById(parseInt(organizationId))
      return dbOrg ? mapDbOrganizationToDomain(dbOrg) : null
    } catch (error) {
      console.error('Error getting organization by ID:', error)
      return null
    }
  }

  async getByLogin(login: string): Promise<Organization | null> {
    try {
      const organizations = await query<DbTypes.Organization>(`
        SELECT * FROM organizations WHERE name = ?
      `, [login])
      
      return organizations.length > 0 ? mapDbOrganizationToDomain(organizations[0]) : null
    } catch (error) {
      console.error('Error getting organization by login:', error)
      return null
    }
  }

  async getUserOrganizationsWithRole(
    userId: string
  ): Promise<Array<Organization & { role: 'admin' | 'member' }>> {
    try {
      const dbOrganizations = await OrganizationRepository.getUserOrganizationsWithRole(userId)
      
      return dbOrganizations.map(orgWithRole => ({
        ...mapDbOrganizationToDomain(orgWithRole),
        role: orgWithRole.role === 'owner' ? 'admin' as const : orgWithRole.role as 'admin' | 'member'
      }))
    } catch (error) {
      console.error('Error getting user organizations with role:', error)
      return []
    }
  }

  async getMembers(
    organizationId: string,
    pagination?: Pagination
  ): Promise<PaginatedResult<OrganizationMember>> {
    const page = pagination || Pagination.create(1, 10)
    const offset = page.offset
    const limit = page.limit
    const orgId = parseInt(organizationId)

    try {
      // Get organization members with pagination
      const members = await query<{
        id: string
        name: string | null
        email: string | null
        image: string | null
        role: string
        created_at: string
      }>(`
        SELECT 
          u.id,
          u.name,
          u.email,
          u.image,
          uo.role,
          uo.created_at as joined_at
        FROM users u
        JOIN user_organizations uo ON u.id = uo.user_id
        WHERE uo.organization_id = ?
        ORDER BY uo.created_at DESC
        LIMIT ? OFFSET ?
      `, [orgId, limit, offset])

      // Get total count
      const countResult = await query<{ total: number }>(`
        SELECT COUNT(*) as total
        FROM user_organizations
        WHERE organization_id = ?
      `, [orgId])

      const total = countResult[0]?.total || 0
      
      const data: OrganizationMember[] = members.map(member => ({
        id: member.id,
        login: member.name || 'unknown',
        name: member.name,
        email: member.email,
        avatarUrl: member.image || '',
        role: member.role === 'owner' ? 'admin' as const : member.role as 'admin' | 'member',
        joinedAt: new Date(member.created_at)
      }))

      return {
        data,
        pagination: {
          page: page.page,
          limit: page.limit,
          total,
          totalPages: Math.ceil(total / page.limit),
          hasNext: offset + limit < total,
          hasPrev: page.page > 1
        }
      }
    } catch (error) {
      console.error('Error getting organization members:', error)
      return {
        data: [],
        pagination: {
          page: page.page,
          limit: page.limit,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        }
      }
    }
  }

  async getRepositories(
    organizationId: string,
    filters?: {
      isTracked?: boolean
      isArchived?: boolean
      language?: string
    }
  ): Promise<Repository[]> {
    try {
      const orgId = parseInt(organizationId)
      let whereClause = 'WHERE organization_id = ?'
      const params: any[] = [orgId]

      if (filters?.isTracked !== undefined) {
        whereClause += ' AND is_tracked = ?'
        params.push(filters.isTracked ? 1 : 0)
      }

      // Note: isArchived and language are not in current DB schema
      // These would need to be added to support full filtering

      const repositories = await query<DbTypes.Repository>(`
        SELECT * FROM repositories
        ${whereClause}
        ORDER BY name ASC
      `, params)

      return repositories.map(mapDbRepositoryToDomain)
    } catch (error) {
      console.error('Error getting organization repositories:', error)
      return []
    }
  }

  async getSettings(organizationId: string): Promise<OrganizationSettings> {
    try {
      const orgId = parseInt(organizationId)
      
      // Get organization settings (if implemented in database)
      const settings = await query<{ key: string; value: string }>(`
        SELECT key, value
        FROM settings
        WHERE organization_id = ?
      `, [orgId])

      // Convert settings to object
      const settingsMap = new Map(settings.map(s => [s.key, s.value]))
      
      // Get categories for this organization
      const categories = await CategoryRepository.getCategoriesByOrganization(orgId)

      return {
        organizationId,
        aiCategorization: settingsMap.get('aiCategorization') === 'true',
        webhookEnabled: settingsMap.get('webhookEnabled') === 'true',
        syncInterval: parseInt(settingsMap.get('syncInterval') || '60'),
        categories: categories.map(cat => ({
          id: cat.id.toString(),
          name: cat.name,
          description: cat.description,
          color: cat.color || '#6b7280'
        }))
      }
    } catch (error) {
      console.error('Error getting organization settings:', error)
      // Return default settings
      return {
        organizationId,
        aiCategorization: true,
        webhookEnabled: false,
        syncInterval: 60,
        categories: []
      }
    }
  }

  async updateSettings(
    organizationId: string,
    settings: Partial<OrganizationSettings>
  ): Promise<OrganizationSettings> {
    try {
      const orgId = parseInt(organizationId)
      
      // Update individual settings
      for (const [key, value] of Object.entries(settings)) {
        if (key === 'organizationId' || key === 'categories') continue
        
        await execute(`
          INSERT OR REPLACE INTO settings (organization_id, key, value)
          VALUES (?, ?, ?)
        `, [orgId, key, String(value)])
      }

      return this.getSettings(organizationId)
    } catch (error) {
      console.error('Error updating organization settings:', error)
      throw new Error('Failed to update settings')
    }
  }

  async getCategories(organizationId: string): Promise<Category[]> {
    try {
      const orgId = parseInt(organizationId)
      const dbCategories = await CategoryRepository.getCategoriesByOrganization(orgId)
      return dbCategories.map(mapDbCategoryToDomain)
    } catch (error) {
      console.error('Error getting categories:', error)
      return []
    }
  }

  async createCategory(
    organizationId: string,
    category: {
      name: string
      description?: string
      color: string
    }
  ): Promise<Category> {
    try {
      const orgId = parseInt(organizationId)
      const dbCategory = await CategoryRepository.createCategory({
        organization_id: orgId,
        name: category.name,
        description: category.description || null,
        color: category.color
      })

      return mapDbCategoryToDomain(dbCategory)
    } catch (error) {
      console.error('Error creating category:', error)
      throw new Error('Failed to create category')
    }
  }

  async updateCategory(
    organizationId: string,
    categoryId: string,
    updates: Partial<{
      name: string
      description: string
      color: string
    }>
  ): Promise<Category> {
    try {
      const catId = parseInt(categoryId)
      const dbUpdates: Partial<DbTypes.Category> = {}
      
      if (updates.name) dbUpdates.name = updates.name
      if (updates.description !== undefined) dbUpdates.description = updates.description
      if (updates.color) dbUpdates.color = updates.color

      const updatedCategory = await CategoryRepository.updateCategory(catId, dbUpdates)
      
      if (!updatedCategory) {
        throw new Error('Category not found')
      }

      return mapDbCategoryToDomain(updatedCategory)
    } catch (error) {
      console.error('Error updating category:', error)
      throw new Error('Failed to update category')
    }
  }

  async deleteCategory(organizationId: string, categoryId: string): Promise<void> {
    try {
      const catId = parseInt(categoryId)
      await CategoryRepository.deleteCategory(catId)
    } catch (error) {
      console.error('Error deleting category:', error)
      throw new Error('Failed to delete category')
    }
  }

  async getMetrics(organizationId: string): Promise<OrganizationMetrics> {
    try {
      const orgId = parseInt(organizationId)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

      // Get repository counts
      const repoStats = await query<{
        total_repositories: number
        tracked_repositories: number
      }>(`
        SELECT 
          COUNT(*) as total_repositories,
          SUM(CASE WHEN is_tracked = true THEN 1 ELSE 0 END) as tracked_repositories
        FROM repositories
        WHERE organization_id = ?
      `, [orgId])

      // Get contributor and PR stats
      const activityStats = await query<{
        total_contributors: number
        total_pull_requests: number
        avg_cycle_time: number
        avg_pr_size: number
        categorized_prs: number
      }>(`
        SELECT 
          COUNT(DISTINCT pr.author_id) as total_contributors,
          COUNT(pr.id) as total_pull_requests,
          AVG(CASE 
            WHEN pr.state = 'merged' AND pr.merged_at IS NOT NULL
            THEN CAST((julianday(pr.merged_at) - julianday(pr.created_at)) * 24 AS REAL)
            ELSE NULL
          END) as avg_cycle_time,
          AVG(COALESCE(pr.additions, 0) + COALESCE(pr.deletions, 0)) as avg_pr_size,
          SUM(CASE WHEN pr.category_id IS NOT NULL THEN 1 ELSE 0 END) as categorized_prs
        FROM pull_requests pr
        LEFT JOIN repositories r ON pr.repository_id = r.id
        WHERE r.organization_id = ?
        AND pr.created_at >= ?
      `, [orgId, thirtyDaysAgo.toISOString()])

      const repoData = repoStats[0] || { total_repositories: 0, tracked_repositories: 0 }
      const activityData = activityStats[0] || { 
        total_contributors: 0, 
        total_pull_requests: 0, 
        avg_cycle_time: 0, 
        avg_pr_size: 0,
        categorized_prs: 0
      }

      const categorizationRate = activityData.total_pull_requests > 0
        ? (activityData.categorized_prs / activityData.total_pull_requests) * 100
        : 0

      // Calculate health score based on multiple factors
      const healthFactors = [
        Math.min(100, categorizationRate), // Categorization rate
        Math.max(0, 100 - (activityData.avg_cycle_time || 0)), // Lower cycle time is better
        Math.min(100, (activityData.total_contributors || 0) * 10), // More contributors is better
        Math.min(100, (repoData.tracked_repositories / Math.max(1, repoData.total_repositories)) * 100) // Higher tracking ratio is better
      ]
      const healthScore = healthFactors.reduce((sum, factor) => sum + factor, 0) / healthFactors.length

      return {
        organizationId,
        totalRepositories: repoData.total_repositories,
        trackedRepositories: repoData.tracked_repositories,
        totalContributors: activityData.total_contributors,
        totalPullRequests: activityData.total_pull_requests,
        averageCycleTime: Math.round((activityData.avg_cycle_time || 0) * 10) / 10,
        averagePRSize: Math.round(activityData.avg_pr_size || 0),
        categorizationRate: Math.round(categorizationRate * 10) / 10,
        healthScore: Math.round(healthScore * 10) / 10,
        period: {
          start: thirtyDaysAgo,
          end: new Date()
        }
      }
    } catch (error) {
      console.error('Error getting organization metrics:', error)
      throw new Error('Failed to get organization metrics')
    }
  }

  async syncFromGitHub(organizationId: string): Promise<Organization> {
    try {
      const dbOrg = await OrganizationRepository.findOrganizationById(parseInt(organizationId))
      if (!dbOrg) {
        throw new Error(`Organization ${organizationId} not found`)
      }

      // In a full implementation, this would sync data from GitHub API
      // For now, just return the organization as is
      const updatedOrg = dbOrg

      return updatedOrg ? mapDbOrganizationToDomain(updatedOrg) : mapDbOrganizationToDomain(dbOrg)
    } catch (error) {
      console.error('Error syncing organization from GitHub:', error)
      throw new Error('Failed to sync organization')
    }
  }

  async hasGitHubAppInstalled(organizationId: string): Promise<boolean> {
    try {
      const dbOrg = await OrganizationRepository.findOrganizationById(parseInt(organizationId))
      return Boolean(dbOrg?.installation_id)
    } catch (error) {
      console.error('Error checking GitHub app installation:', error)
      return false
    }
  }
}
