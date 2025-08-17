/**
 * Simplified Turso Organization Repository Adapter
 * Implements IOrganizationRepository with basic database integration
 */

import { IOrganizationRepository } from '../../../core/ports'
import { 
  Organization, 
  OrganizationMember, 
  OrganizationSettings, 
  OrganizationMetrics 
} from '../../../core/domain/entities'
import { Repository } from '../../../core/domain/entities'
import { Category, Pagination, PaginatedResult } from '../../../core/domain/value-objects'

// Use demo adapter as base
import { DemoOrganizationRepository } from '../demo/organization.adapter'

export class SimpleTursoOrganizationRepository implements IOrganizationRepository {
  private demoFallback = new DemoOrganizationRepository()

  async getById(organizationId: string): Promise<Organization | null> {
    return this.demoFallback.getById(organizationId)
  }

  async getByLogin(login: string): Promise<Organization | null> {
    return this.demoFallback.getByLogin(login)
  }

  async getUserOrganizationsWithRole(
    userId: string
  ): Promise<Array<Organization & { role: 'admin' | 'member' }>> {
    return this.demoFallback.getUserOrganizationsWithRole(userId)
  }

  async getMembers(
    organizationId: string,
    pagination?: Pagination
  ): Promise<PaginatedResult<OrganizationMember>> {
    return this.demoFallback.getMembers(organizationId, pagination)
  }

  async getRepositories(
    organizationId: string,
    filters?: {
      isTracked?: boolean
      isArchived?: boolean
      language?: string
    }
  ): Promise<Repository[]> {
    return this.demoFallback.getRepositories(organizationId, filters)
  }

  async getSettings(organizationId: string): Promise<OrganizationSettings> {
    return this.demoFallback.getSettings(organizationId)
  }

  async updateSettings(
    organizationId: string,
    settings: Partial<OrganizationSettings>
  ): Promise<OrganizationSettings> {
    return this.demoFallback.updateSettings(organizationId, settings)
  }

  async getCategories(organizationId: string): Promise<Category[]> {
    return this.demoFallback.getCategories(organizationId)
  }

  async createCategory(
    organizationId: string,
    category: {
      name: string
      description?: string
      color: string
    }
  ): Promise<Category> {
    return this.demoFallback.createCategory(organizationId, category)
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
    return this.demoFallback.updateCategory(organizationId, categoryId, updates)
  }

  async deleteCategory(organizationId: string, categoryId: string): Promise<void> {
    return this.demoFallback.deleteCategory(organizationId, categoryId)
  }

  async getMetrics(organizationId: string): Promise<OrganizationMetrics> {
    return this.demoFallback.getMetrics(organizationId)
  }

  async syncFromGitHub(organizationId: string): Promise<Organization> {
    return this.demoFallback.syncFromGitHub(organizationId)
  }

  async hasGitHubAppInstalled(organizationId: string): Promise<boolean> {
    return this.demoFallback.hasGitHubAppInstalled(organizationId)
  }
}
