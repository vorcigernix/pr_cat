/**
 * Turso Adapters Index
 * Exports Turso database adapter implementations with real database queries
 */

// Export production adapters that query the database
export { TursoAuthService } from './auth.adapter'
export { TursoOrganizationRepository } from './organization.adapter'
export { TursoRepository } from './repository.adapter'

// Note: Optimized adapters are imported directly where needed
// - OptimizedTursoPullRequestRepository from './optimized-pull-request.adapter'
// - OptimizedTursoMetricsService from './optimized-metrics.adapter'
