/**
 * Environment Configuration
 * Detects and provides application environment settings
 */

export interface AppConfig {
  mode: 'demo' | 'production'
  isDemoMode: boolean
  hasDatabase: boolean
  hasGitHubApp: boolean
  database?: {
    url: string
    token?: string
  }
  github?: {
    appId: string
    privateKey: string
    webhookSecret?: string
    clientId?: string
    clientSecret?: string
  }
  auth?: {
    secret: string
    url: string
  }
}

export class EnvironmentConfig {
  private static _instance: EnvironmentConfig
  private _config: AppConfig

  private constructor() {
    this._config = this.loadConfiguration()
  }

  static getInstance(): EnvironmentConfig {
    if (!EnvironmentConfig._instance) {
      EnvironmentConfig._instance = new EnvironmentConfig()
    }
    return EnvironmentConfig._instance
  }

  get config(): AppConfig {
    return { ...this._config }
  }

  private loadConfiguration(): AppConfig {
    const hasDatabase = Boolean(
      process.env.TURSO_URL && 
      process.env.TURSO_TOKEN
    )
    
    const hasGitHubApp = Boolean(
      process.env.GITHUB_APP_ID && 
      process.env.GITHUB_APP_PRIVATE_KEY
    )
    
    // Force demo mode if explicitly set
    const forceDemoMode = process.env.DEMO_MODE === 'true'
    
    // Auto-detect demo mode if missing required services
    const isDemoMode = forceDemoMode || !hasDatabase || !hasGitHubApp
    
    const config: AppConfig = {
      mode: isDemoMode ? 'demo' : 'production',
      isDemoMode,
      hasDatabase,
      hasGitHubApp
    }

    // Add database config if available
    if (hasDatabase) {
      config.database = {
        url: process.env.TURSO_URL!,
        token: process.env.TURSO_TOKEN
      }
    }

    // Add GitHub config if available
    if (hasGitHubApp) {
      config.github = {
        appId: process.env.GITHUB_APP_ID!,
        privateKey: process.env.GITHUB_APP_PRIVATE_KEY!,
        webhookSecret: process.env.GITHUB_WEBHOOK_SECRET,
        clientId: process.env.GITHUB_OAUTH_CLIENT_ID,
        clientSecret: process.env.GITHUB_OAUTH_CLIENT_SECRET
      }
    }

    // Add auth config
    config.auth = {
      secret: process.env.NEXTAUTH_SECRET || 'demo-secret-key-not-for-production',
      url: process.env.NEXTAUTH_URL || process.env.VERCEL_URL 
        ? `https://${process.env.VERCEL_URL}` 
        : 'http://localhost:3000'
    }

    return config
  }

  // Refresh configuration (useful for testing)
  refresh(): void {
    this._config = this.loadConfiguration()
  }

  // Environment helpers
  isDemoMode(): boolean {
    return this._config.isDemoMode
  }

  isProductionMode(): boolean {
    return this._config.mode === 'production'
  }

  hasFeature(feature: 'database' | 'github' | 'auth'): boolean {
    switch (feature) {
      case 'database':
        return this._config.hasDatabase
      case 'github':
        return this._config.hasGitHubApp
      case 'auth':
        return Boolean(this._config.auth)
      default:
        return false
    }
  }

  getDatabaseConfig(): AppConfig['database'] {
    if (!this._config.database) {
      throw new Error('Database configuration not available')
    }
    return this._config.database
  }

  getGitHubConfig(): AppConfig['github'] {
    if (!this._config.github) {
      throw new Error('GitHub configuration not available')
    }
    return this._config.github
  }

  getAuthConfig(): AppConfig['auth'] {
    if (!this._config.auth) {
      throw new Error('Auth configuration not available')
    }
    return this._config.auth
  }

  // Debug information
  getDebugInfo(): {
    mode: string
    features: string[]
    missingEnvVars: string[]
  } {
    const features = []
    const missingEnvVars = []

    if (this._config.hasDatabase) {
      features.push('database')
    } else {
      missingEnvVars.push('TURSO_URL', 'TURSO_TOKEN')
    }

    if (this._config.hasGitHubApp) {
      features.push('github')
    } else {
      missingEnvVars.push('GITHUB_APP_ID', 'GITHUB_PRIVATE_KEY')
    }

    features.push('auth')

    return {
      mode: this._config.mode,
      features,
      missingEnvVars
    }
  }
}
