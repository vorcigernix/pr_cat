/**
 * Pull Request Domain Entity
 * Core business entity representing a pull request
 */

export interface PullRequest {
  id: string | number
  number: number
  title: string
  developer: {
    id: string | number
    name: string
  }
  repository: {
    id: string | number
    name: string
  }
  status: 'open' | 'closed' | 'merged'
  createdAt: string
  mergedAt: string
  cycleTime: number
  investmentArea?: string
  linesAdded?: number
  files?: number
}

export interface PullRequestSummary {
  id: string | number
  number: number
  title: string
  developer: {
    id: string | number
    name: string
  }
  repository: {
    id: string | number
    name: string
  }
  status: 'open' | 'closed' | 'merged'
  createdAt: string
  mergedAt: string
  cycleTime: number
  investmentArea?: string
  linesAdded?: number
  files?: number
}

export interface PullRequestMetrics {
  totalCount: number
  openCount: number
  mergedCount: number
  closedCount: number
  averageCycleTime: number // in hours
  averageReviewTime: number // in hours
  averageSize: number // lines of code
  categoryDistribution: Array<{
    categoryName: string
    count: number
    percentage: number
  }>
}
