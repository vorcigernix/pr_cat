/**
 * Demo Organization Repository Adapter
 * Implements IOrganizationRepository using static demo data
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
import { 
  DEMO_ORGANIZATIONS, 
  DEMO_USERS, 
  DEMO_REPOSITORIES,
  DEMO_CATEGORIES
} from './data/demo-data'

export class DemoOrganizationRepository implements IOrganizationRepository {
  
  async getById(organizationId: string): Promise<Organization | null> {
    return DEMO_ORGANIZATIONS.find(org => org.id === organizationId) || null
  }

  async getByLogin(login: string): Promise<Organization | null> {
    return DEMO_ORGANIZATIONS.find(org => org.login === login) || null
  }

  async getUserOrganizationsWithRole(
    userId: string
  ): Promise<Array<Organization & { role: 'admin' | 'member' }>> {
    // In demo mode, return all organizations with roles
    return DEMO_ORGANIZATIONS.map((org, index) => ({
      ...org,
      role: index === 0 ? 'admin' as const : 'member' as const
    }))
  }

  async getMembers(
    organizationId: string,
    pagination?: Pagination
  ): Promise<PaginatedResult<OrganizationMember>> {
    // Convert demo users to organization members
    const members: OrganizationMember[] = DEMO_USERS.map((user, index) => ({
      id: user.id,
      login: user.login,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      role: index === 0 ? 'admin' as const : 'member' as const,
      joinedAt: user.createdAt
    }))

    const page = pagination || Pagination.create(1, 10)
    const startIndex = page.offset
    const endIndex = startIndex + page.limit
    const paginatedData = members.slice(startIndex, endIndex)
    const total = members.length

    return {
      data: paginatedData,
      pagination: {
        page: page.page,
        limit: page.limit,
        total,
        totalPages: Math.ceil(total / page.limit),
        hasNext: endIndex < total,
        hasPrev: page.page > 1
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
    let repositories = DEMO_REPOSITORIES.filter(repo => repo.organizationId === organizationId)

    if (filters?.isTracked !== undefined) {
      repositories = repositories.filter(repo => repo.isTracked === filters.isTracked)
    }

    if (filters?.isArchived !== undefined) {
      repositories = repositories.filter(repo => repo.isArchived === filters.isArchived)
    }

    if (filters?.language) {
      repositories = repositories.filter(repo => repo.language === filters.language)
    }

    return repositories
  }

  async getSettings(organizationId: string): Promise<OrganizationSettings> {
    return {
      organizationId,
      aiCategorization: true,
      webhookEnabled: true,
      syncInterval: 60, // 1 hour
      categories: DEMO_CATEGORIES.map(cat => ({
        id: cat.id,
        name: cat.name,
        description: cat.description,
        color: cat.color
      }))
    }
  }

  async updateSettings(
    organizationId: string,
    settings: Partial<OrganizationSettings>
  ): Promise<OrganizationSettings> {
    // In demo mode, return current settings with updates applied
    const currentSettings = await this.getSettings(organizationId)
    return {
      ...currentSettings,
      ...settings
    }
  }

  async getCategories(organizationId: string): Promise<Category[]> {
    return DEMO_CATEGORIES.map(cat => 
      Category.create(cat.id, cat.name, cat.description, cat.color)
    )
  }

  async createCategory(
    organizationId: string,
    category: {
      name: string
      description?: string
      color: string
    }
  ): Promise<Category> {
    // In demo mode, create new category with generated ID
    const newId = `demo-cat-${Date.now()}`
    return Category.create(newId, category.name, category.description || null, category.color)
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
    const existing = DEMO_CATEGORIES.find(cat => cat.id === categoryId)
    if (!existing) {
      throw new Error(`Category ${categoryId} not found`)
    }

    return Category.create(
      categoryId,
      updates.name || existing.name,
      updates.description !== undefined ? updates.description : existing.description,
      updates.color || existing.color
    )
  }

  async deleteCategory(organizationId: string, categoryId: string): Promise<void> {
    // In demo mode, just validate the category exists
    const exists = DEMO_CATEGORIES.some(cat => cat.id === categoryId)
    if (!exists) {
      throw new Error(`Category ${categoryId} not found`)
    }
    // No actual deletion needed in demo mode
  }

  async getMetrics(organizationId: string): Promise<OrganizationMetrics> {
    const repositories = await this.getRepositories(organizationId)
    const trackedRepos = repositories.filter(repo => repo.isTracked)

    return {
      organizationId,
      totalRepositories: repositories.length,
      trackedRepositories: trackedRepos.length,
      totalContributors: DEMO_USERS.length,
      totalPullRequests: 127,
      averageCycleTime: 35.4,
      averagePRSize: 172,
      categorizationRate: 89.8,
      healthScore: 84.8,
      period: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        end: new Date()
      }
    }
  }

  async syncFromGitHub(organizationId: string): Promise<Organization> {
    // In demo mode, just return the existing organization
    const org = await this.getById(organizationId)
    if (!org) {
      throw new Error(`Organization ${organizationId} not found`)
    }

    return {
      ...org,
      updatedAt: new Date()
    }
  }

  async hasGitHubAppInstalled(organizationId: string): Promise<boolean> {
    const org = await this.getById(organizationId)
    return org?.isInstalled || false
  }
}
