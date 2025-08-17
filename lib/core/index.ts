/**
 * Core Architecture Index
 * Main export point for the clean architecture layer
 */

// Domain layer exports
export * from './domain/entities'
export * from './domain/value-objects'

// Application layer exports  
export * from './ports'
export * from './application'

// Container layer exports
export * from './container'

// Infrastructure exports for convenience
export { EnvironmentConfig } from '../infrastructure/config'

// Re-export convenience types (avoiding module resolution issues for now)

// Value object classes
export {
  TimeRange,
  Category,
  Pagination,
  UNCATEGORIZED_CATEGORY,
} from './domain/value-objects'
