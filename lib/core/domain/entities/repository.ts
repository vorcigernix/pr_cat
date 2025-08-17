/**
 * Repository Domain Entity
 * Represents a GitHub repository
 */

export interface Repository {
  id: string
  name: string
  fullName: string
  description: string | null
  htmlUrl: string
  defaultBranch: string
  isPrivate: boolean
  isTracked: boolean
  isArchived: boolean
  language: string | null
  size: number // in KB
  stargazersCount: number
  forksCount: number
  openIssuesCount: number
  organizationId: string
  createdAt: Date
  updatedAt: Date
  pushedAt: Date | null
}

export interface RepositoryMetrics {
  repositoryId: string
  name: string
  fullName: string
  isTracked: boolean
  hasData: boolean
  metrics: {
    totalPRs: number
    openPRs: number
    avgCycleTime: number
    avgPRSize: number
    categorizationRate: number
    activityScore: number
    contributorCount: number
    reviewCoverage: number
    healthScore: number
  }
  trends: {
    prVelocityTrend: 'up' | 'down' | 'stable'
    cycleTimeTrend: 'up' | 'down' | 'stable'
    qualityTrend: 'up' | 'down' | 'stable'
  }
}

export interface RepositoryInsights {
  repositories: RepositoryMetrics[]
  topPerformers: RepositoryMetrics[]
  needsAttention: RepositoryMetrics[]
  organizationAverages: {
    avgCycleTime: number
    avgPRSize: number
    avgCategorizationRate: number
    avgHealthScore: number
  }
}
