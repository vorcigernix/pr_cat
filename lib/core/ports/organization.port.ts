/**
 * Organization Repository Port
 * Defines the contract for organization data operations
 */

import { 
  Organization, 
  OrganizationMember, 
  OrganizationSettings, 
  OrganizationMetrics 
} from '../domain/entities/organization'
import { Repository } from '../domain/entities/repository'
import { Category } from '../domain/value-objects/category'
import { Pagination, PaginatedResult } from '../domain/value-objects/pagination'

export interface IOrganizationRepository {
  /**
   * Get organization by ID
   */
  getById(organizationId: string): Promise<Organization | null>

  /**
   * Get organization by login name
   */
  getByLogin(login: string): Promise<Organization | null>

  /**
   * Get organizations for a user with their role
   */
  getUserOrganizationsWithRole(
    userId: string
  ): Promise<Array<Organization & { role: 'admin' | 'member' }>>

  /**
   * Get organization members
   */
  getMembers(
    organizationId: string,
    pagination?: Pagination
  ): Promise<PaginatedResult<OrganizationMember>>

  /**
   * Get organization repositories
   */
  getRepositories(
    organizationId: string,
    filters?: {
      isTracked?: boolean
      isArchived?: boolean
      language?: string
    }
  ): Promise<Repository[]>

  /**
   * Get organization settings
   */
  getSettings(organizationId: string): Promise<OrganizationSettings>

  /**
   * Update organization settings
   */
  updateSettings(
    organizationId: string,
    settings: Partial<OrganizationSettings>
  ): Promise<OrganizationSettings>

  /**
   * Get organization categories
   */
  getCategories(organizationId: string): Promise<Category[]>

  /**
   * Create category for organization
   */
  createCategory(
    organizationId: string,
    category: {
      name: string
      description?: string
      color: string
    }
  ): Promise<Category>

  /**
   * Update category
   */
  updateCategory(
    organizationId: string,
    categoryId: string,
    updates: Partial<{
      name: string
      description: string
      color: string
    }>
  ): Promise<Category>

  /**
   * Delete category
   */
  deleteCategory(organizationId: string, categoryId: string): Promise<void>

  /**
   * Get organization metrics
   */
  getMetrics(organizationId: string): Promise<OrganizationMetrics>

  /**
   * Update organization from GitHub API
   */
  syncFromGitHub(organizationId: string): Promise<Organization>

  /**
   * Check if organization has GitHub App installed
   */
  hasGitHubAppInstalled(organizationId: string): Promise<boolean>
}
