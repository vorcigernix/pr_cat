/**
 * Turso Pull Request Repository Adapter
 * Implements IPullRequestRepository using real Turso database queries
 */

import { IPullRequestRepository } from '../../../core/ports'
import { 
  PullRequest, 
  PullRequestSummary, 
  PullRequestMetrics,
  CategoryDistribution,
  CategoryTimeSeriesData
} from '../../../core/domain/entities'
import { TimeRange, Pagination, PaginatedResult } from '../../../core/domain/value-objects'
import { query } from '@/lib/db'
import { 
  mapPullRequestWithDetailsToSummary,
  mapPullRequestWithDetailsToDomain,
  calculateCycleTimeHours,
  PullRequestWithDetails
} from './mappers'

export class TursoPullRequestRepository implements IPullRequestRepository {

  async getRecent(
    organizationId: string, 
    pagination?: Pagination
  ): Promise<PaginatedResult<PullRequestSummary>> {
    const page = pagination || Pagination.create(1, 10)
    const offset = page.offset
    const limit = page.limit

    // Get recent PRs with all necessary joined data
    const prs = await query<PullRequestWithDetails>(`
      SELECT 
        pr.*,
        r.name as repository_name,
        u.name as author_login,
        u.image as author_avatar,
        c.name as category_name,
        c.color as category_color
      FROM pull_requests pr
      LEFT JOIN repositories r ON pr.repository_id = r.id
      LEFT JOIN users u ON pr.author_id = u.id
      LEFT JOIN categories c ON pr.category_id = c.id
      WHERE r.organization_id = ?
      ORDER BY pr.created_at DESC
      LIMIT ? OFFSET ?
    `, [parseInt(organizationId), limit, offset])

    // Get total count for pagination
    const countResult = await query<{ total: number }>(`
      SELECT COUNT(pr.id) as total
      FROM pull_requests pr
      LEFT JOIN repositories r ON pr.repository_id = r.id
      WHERE r.organization_id = ?
    `, [parseInt(organizationId)])

    const total = countResult[0]?.total || 0
    const data = prs.map(mapPullRequestWithDetailsToSummary)

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
  }

  async getById(pullRequestId: string): Promise<PullRequest | null> {
    const prs = await query<PullRequestWithDetails>(`
      SELECT 
        pr.*,
        r.name as repository_name,
        u.name as author_login,
        u.image as author_avatar,
        c.name as category_name,
        c.color as category_color
      FROM pull_requests pr
      LEFT JOIN repositories r ON pr.repository_id = r.id
      LEFT JOIN users u ON pr.author_id = u.id
      LEFT JOIN categories c ON pr.category_id = c.id
      WHERE pr.id = ?
    `, [parseInt(pullRequestId)])

    if (prs.length === 0) return null

    return mapPullRequestWithDetailsToDomain(prs[0])
  }

  async getByCategory(
    organizationId: string, 
    categoryId?: string,
    timeRange?: TimeRange
  ): Promise<PullRequest[]> {
    let whereClause = 'WHERE r.organization_id = ?'
    const params: any[] = [parseInt(organizationId)]

    if (categoryId) {
      whereClause += ' AND pr.category_id = ?'
      params.push(parseInt(categoryId))
    }

    if (timeRange) {
      whereClause += ' AND pr.created_at >= ? AND pr.created_at <= ?'
      params.push(timeRange.start.toISOString(), timeRange.end.toISOString())
    }

    const prs = await query<PullRequestWithDetails>(`
      SELECT 
        pr.*,
        r.name as repository_name,
        u.name as author_login,
        u.image as author_avatar,
        c.name as category_name,
        c.color as category_color
      FROM pull_requests pr
      LEFT JOIN repositories r ON pr.repository_id = r.id
      LEFT JOIN users u ON pr.author_id = u.id
      LEFT JOIN categories c ON pr.category_id = c.id
      ${whereClause}
      ORDER BY pr.created_at DESC
    `, params)

    return prs.map(mapPullRequestWithDetailsToDomain)
  }

  async getCategoryDistribution(
    organizationId: string,
    timeRange?: TimeRange
  ): Promise<CategoryDistribution[]> {
    let whereClause = 'WHERE r.organization_id = ?'
    const params: any[] = [parseInt(organizationId)]

    if (timeRange) {
      whereClause += ' AND pr.created_at >= ? AND pr.created_at <= ?'
      params.push(timeRange.start.toISOString(), timeRange.end.toISOString())
    }

    const results = await query<{
      category_name: string | null
      count: number
    }>(`
      SELECT 
        COALESCE(c.name, 'Uncategorized') as category_name,
        COUNT(pr.id) as count
      FROM pull_requests pr
      LEFT JOIN repositories r ON pr.repository_id = r.id
      LEFT JOIN categories c ON pr.category_id = c.id
      ${whereClause}
      GROUP BY c.name
      ORDER BY count DESC
    `, params)

    const total = results.reduce((sum, result) => sum + result.count, 0)

    return results.map(result => ({
      categoryName: result.category_name || 'Uncategorized',
      count: result.count,
      percentage: total > 0 ? (result.count / total) * 100 : 0
    }))
  }

  async getCategoryTimeSeries(
    organizationId: string,
    days: number
  ): Promise<CategoryTimeSeriesData> {
    const endDate = new Date()
    const startDate = new Date(endDate)
    startDate.setDate(startDate.getDate() - days)

    // Get categories
    const categories = await query<{ id: number; name: string; color: string }>(`
      SELECT id, name, COALESCE(color, '#6b7280') as color
      FROM categories
      WHERE organization_id = ?
      ORDER BY name
    `, [parseInt(organizationId)])

    // Generate time series data
    const timeSeriesData = []
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(endDate)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]

      const dayData: { date: string; [key: string]: string | number } = { date: dateStr }

      // Get PR counts for each category on this day
      for (const category of categories) {
        const result = await query<{ count: number }>(`
          SELECT COUNT(pr.id) as count
          FROM pull_requests pr
          LEFT JOIN repositories r ON pr.repository_id = r.id
          WHERE r.organization_id = ?
          AND pr.category_id = ?
          AND DATE(pr.created_at) = ?
        `, [parseInt(organizationId), category.id, dateStr])

        const key = category.name.replace(/\s+/g, '_')
        dayData[key] = result[0]?.count || 0
      }

      timeSeriesData.push(dayData)
    }

    return {
      data: timeSeriesData,
      categories: categories.map(cat => ({
        key: cat.name.replace(/\s+/g, '_'),
        label: cat.name,
        color: cat.color
      }))
    }
  }

  async getMetrics(
    organizationId: string,
    timeRange?: TimeRange
  ): Promise<PullRequestMetrics> {
    let whereClause = 'WHERE r.organization_id = ?'
    const params: any[] = [parseInt(organizationId)]

    if (timeRange) {
      whereClause += ' AND pr.created_at >= ? AND pr.created_at <= ?'
      params.push(timeRange.start.toISOString(), timeRange.end.toISOString())
    }

    // Get basic counts
    const basicStats = await query<{
      total_count: number
      open_count: number
      merged_count: number
      closed_count: number
    }>(`
      SELECT 
        COUNT(pr.id) as total_count,
        SUM(CASE WHEN pr.state = 'open' THEN 1 ELSE 0 END) as open_count,
        SUM(CASE WHEN pr.state = 'merged' THEN 1 ELSE 0 END) as merged_count,
        SUM(CASE WHEN pr.state = 'closed' THEN 1 ELSE 0 END) as closed_count
      FROM pull_requests pr
      LEFT JOIN repositories r ON pr.repository_id = r.id
      ${whereClause}
    `, params)

    // Get cycle time for merged PRs
    const cycleTimeStats = await query<{
      avg_cycle_time: number
      avg_size: number
    }>(`
      SELECT 
        AVG(CAST((julianday(pr.merged_at) - julianday(pr.created_at)) * 24 AS REAL)) as avg_cycle_time,
        AVG(COALESCE(pr.additions, 0) + COALESCE(pr.deletions, 0)) as avg_size
      FROM pull_requests pr
      LEFT JOIN repositories r ON pr.repository_id = r.id
      ${whereClause}
      AND pr.state = 'merged'
      AND pr.merged_at IS NOT NULL
    `, params)

    // Get category distribution
    const categoryDistribution = await this.getCategoryDistribution(organizationId, timeRange)

    const stats = basicStats[0] || { total_count: 0, open_count: 0, merged_count: 0, closed_count: 0 }
    const cycleStats = cycleTimeStats[0] || { avg_cycle_time: 0, avg_size: 0 }

    return {
      totalCount: stats.total_count,
      openCount: stats.open_count,
      mergedCount: stats.merged_count,
      closedCount: stats.closed_count,
      averageCycleTime: cycleStats.avg_cycle_time || 0,
      averageReviewTime: (cycleStats.avg_cycle_time || 0) * 0.3, // Estimate review time as 30% of cycle time
      averageSize: cycleStats.avg_size || 0,
      categoryDistribution
    }
  }

  async getByAuthor(
    organizationId: string,
    authorId: string,
    pagination?: Pagination
  ): Promise<PaginatedResult<PullRequestSummary>> {
    const page = pagination || Pagination.create(1, 10)
    const offset = page.offset
    const limit = page.limit

    const prs = await query<PullRequestWithDetails>(`
      SELECT 
        pr.*,
        r.name as repository_name,
        u.name as author_login,
        u.image as author_avatar,
        c.name as category_name,
        c.color as category_color
      FROM pull_requests pr
      LEFT JOIN repositories r ON pr.repository_id = r.id
      LEFT JOIN users u ON pr.author_id = u.id
      LEFT JOIN categories c ON pr.category_id = c.id
      WHERE r.organization_id = ? AND pr.author_id = ?
      ORDER BY pr.created_at DESC
      LIMIT ? OFFSET ?
    `, [parseInt(organizationId), authorId, limit, offset])

    const countResult = await query<{ total: number }>(`
      SELECT COUNT(pr.id) as total
      FROM pull_requests pr
      LEFT JOIN repositories r ON pr.repository_id = r.id
      WHERE r.organization_id = ? AND pr.author_id = ?
    `, [parseInt(organizationId), authorId])

    const total = countResult[0]?.total || 0
    const data = prs.map(mapPullRequestWithDetailsToSummary)

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
  }

  async getByRepository(
    repositoryId: string,
    pagination?: Pagination
  ): Promise<PaginatedResult<PullRequestSummary>> {
    const page = pagination || Pagination.create(1, 10)
    const offset = page.offset
    const limit = page.limit

    const prs = await query<PullRequestWithDetails>(`
      SELECT 
        pr.*,
        r.name as repository_name,
        u.name as author_login,
        u.image as author_avatar,
        c.name as category_name,
        c.color as category_color
      FROM pull_requests pr
      LEFT JOIN repositories r ON pr.repository_id = r.id
      LEFT JOIN users u ON pr.author_id = u.id
      LEFT JOIN categories c ON pr.category_id = c.id
      WHERE pr.repository_id = ?
      ORDER BY pr.created_at DESC
      LIMIT ? OFFSET ?
    `, [parseInt(repositoryId), limit, offset])

    const countResult = await query<{ total: number }>(`
      SELECT COUNT(id) as total
      FROM pull_requests
      WHERE repository_id = ?
    `, [parseInt(repositoryId)])

    const total = countResult[0]?.total || 0
    const data = prs.map(mapPullRequestWithDetailsToSummary)

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
  }

  async search(
    organizationId: string,
    searchQuery: string,
    pagination?: Pagination
  ): Promise<PaginatedResult<PullRequestSummary>> {
    const page = pagination || Pagination.create(1, 10)
    const offset = page.offset
    const limit = page.limit
    const searchTerm = `%${searchQuery}%`

    const prs = await query<PullRequestWithDetails>(`
      SELECT 
        pr.*,
        r.name as repository_name,
        u.name as author_login,
        u.image as author_avatar,
        c.name as category_name,
        c.color as category_color
      FROM pull_requests pr
      LEFT JOIN repositories r ON pr.repository_id = r.id
      LEFT JOIN users u ON pr.author_id = u.id
      LEFT JOIN categories c ON pr.category_id = c.id
      WHERE r.organization_id = ?
      AND (
        pr.title LIKE ? OR
        pr.description LIKE ? OR
        u.name LIKE ? OR
        r.name LIKE ?
      )
      ORDER BY pr.created_at DESC
      LIMIT ? OFFSET ?
    `, [parseInt(organizationId), searchTerm, searchTerm, searchTerm, searchTerm, limit, offset])

    const countResult = await query<{ total: number }>(`
      SELECT COUNT(pr.id) as total
      FROM pull_requests pr
      LEFT JOIN repositories r ON pr.repository_id = r.id
      LEFT JOIN users u ON pr.author_id = u.id
      WHERE r.organization_id = ?
      AND (
        pr.title LIKE ? OR
        pr.description LIKE ? OR
        u.name LIKE ? OR
        r.name LIKE ?
      )
    `, [parseInt(organizationId), searchTerm, searchTerm, searchTerm, searchTerm])

    const total = countResult[0]?.total || 0
    const data = prs.map(mapPullRequestWithDetailsToSummary)

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
  }

  async getCount(
    organizationId: string,
    filters?: {
      state?: 'open' | 'closed' | 'merged'
      categoryId?: string
      repositoryId?: string
      authorId?: string
      timeRange?: TimeRange
    }
  ): Promise<number> {
    let whereClause = 'WHERE r.organization_id = ?'
    const params: any[] = [parseInt(organizationId)]

    if (filters?.state) {
      whereClause += ' AND pr.state = ?'
      params.push(filters.state)
    }

    if (filters?.categoryId) {
      whereClause += ' AND pr.category_id = ?'
      params.push(parseInt(filters.categoryId))
    }

    if (filters?.repositoryId) {
      whereClause += ' AND pr.repository_id = ?'
      params.push(parseInt(filters.repositoryId))
    }

    if (filters?.authorId) {
      whereClause += ' AND pr.author_id = ?'
      params.push(filters.authorId)
    }

    if (filters?.timeRange) {
      whereClause += ' AND pr.created_at >= ? AND pr.created_at <= ?'
      params.push(filters.timeRange.start.toISOString(), filters.timeRange.end.toISOString())
    }

    const result = await query<{ count: number }>(`
      SELECT COUNT(pr.id) as count
      FROM pull_requests pr
      LEFT JOIN repositories r ON pr.repository_id = r.id
      ${whereClause}
    `, params)

    return result[0]?.count || 0
  }
}
