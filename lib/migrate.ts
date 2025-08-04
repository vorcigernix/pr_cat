import { execute, query } from './db';

// The schema SQL is embedded directly in the code to avoid file system operations
// which are not supported in Edge Runtime
const SCHEMA_SQL = `
-- Enable Foreign Key constraints
PRAGMA foreign_keys = ON;

-- Schema version tracking table
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE,
  image TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Organizations table (GitHub organizations)
CREATE TABLE IF NOT EXISTS organizations (
  id INTEGER PRIMARY KEY,
  github_id INTEGER UNIQUE,
  name TEXT NOT NULL,
  avatar_url TEXT,
  installation_id INTEGER NULL,
  production_access BOOLEAN NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- User-Organization relationship (many-to-many)
CREATE TABLE IF NOT EXISTS user_organizations (
  user_id TEXT NOT NULL,
  organization_id INTEGER NOT NULL,
  role TEXT NOT NULL DEFAULT 'member', -- 'member', 'admin', 'owner'
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, organization_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Repositories table
CREATE TABLE IF NOT EXISTS repositories (
  id INTEGER PRIMARY KEY,
  github_id INTEGER UNIQUE,
  organization_id INTEGER,
  name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  description TEXT,
  private BOOLEAN NOT NULL DEFAULT 0,
  is_tracked BOOLEAN NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Categories for PR classification
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY,
  organization_id INTEGER,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT,
  is_default BOOLEAN DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Pull Requests table
CREATE TABLE IF NOT EXISTS pull_requests (
  id INTEGER PRIMARY KEY,
  github_id INTEGER NOT NULL,
  repository_id INTEGER NOT NULL,
  number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  author_id TEXT,
  state TEXT NOT NULL, -- 'open', 'closed', 'merged'
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  closed_at TEXT,
  merged_at TEXT,
  draft BOOLEAN NOT NULL DEFAULT 0,
  additions INTEGER,
  deletions INTEGER,
  changed_files INTEGER,
  category_id INTEGER,
  category_confidence REAL,
  embedding_id INTEGER,
  ai_status TEXT DEFAULT NULL, -- Status of AI categorization processing
  error_message TEXT DEFAULT NULL, -- Error message if AI processing fails
  FOREIGN KEY (repository_id) REFERENCES repositories(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  UNIQUE (repository_id, number)
);

-- PR Reviews table
CREATE TABLE IF NOT EXISTS pr_reviews (
  id INTEGER PRIMARY KEY,
  github_id INTEGER NOT NULL,
  pull_request_id INTEGER NOT NULL,
  reviewer_id TEXT,
  state TEXT NOT NULL, -- 'approved', 'changes_requested', 'commented', 'dismissed'
  submitted_at TEXT NOT NULL,
  FOREIGN KEY (pull_request_id) REFERENCES pull_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Settings table for user/org preferences
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY,
  user_id TEXT,
  organization_id INTEGER,
  key TEXT NOT NULL,
  value TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, organization_id, key),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CHECK ((user_id IS NULL) != (organization_id IS NULL)) -- Exactly one of user_id or organization_id must be NULL
);

-- Recommendations table
CREATE TABLE IF NOT EXISTS recommendations (
  id INTEGER PRIMARY KEY,
  organization_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  recommendation_type TEXT NOT NULL, -- 'process', 'technical', 'workflow', etc.
  status TEXT NOT NULL DEFAULT 'open', -- 'open', 'accepted', 'rejected', 'implemented'
  priority INTEGER NOT NULL DEFAULT 1, -- 1-5
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Table for vector embeddings (when enabled)
CREATE TABLE IF NOT EXISTS embeddings (
  id INTEGER PRIMARY KEY,
  source_type TEXT NOT NULL, -- 'pull_request', 'category', etc.
  source_id INTEGER NOT NULL,
  vector BLOB, -- Will store the vector embedding
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (source_type, source_id)
);
`;

// Function to run schema migrations on database startup
// Define migrations as embedded SQL to avoid file system operations in Edge Runtime
const MIGRATIONS = [
  {
    version: 1,
    name: 'initial_schema',
    sql: SCHEMA_SQL
  },
  {
    version: 2,
    name: 'add_ai_status_columns',
    sql: `
      -- Add AI processing status columns to pull_requests table
      ALTER TABLE pull_requests ADD COLUMN ai_status TEXT DEFAULT 'pending';
      ALTER TABLE pull_requests ADD COLUMN error_message TEXT;
    `
  },
  {
    version: 3,
    name: 'add_performance_indexes',
    sql: `
      -- Add performance indexes for common queries
      CREATE INDEX IF NOT EXISTS idx_pull_requests_repo_number ON pull_requests(repository_id, number);
      CREATE INDEX IF NOT EXISTS idx_pull_requests_github_id ON pull_requests(github_id);
      CREATE INDEX IF NOT EXISTS idx_pr_reviews_pull_request_id ON pr_reviews(pull_request_id);
      CREATE INDEX IF NOT EXISTS idx_repositories_organization_id ON repositories(organization_id);
      CREATE INDEX IF NOT EXISTS idx_user_organizations_user_org ON user_organizations(user_id, organization_id);
      CREATE INDEX IF NOT EXISTS idx_pull_requests_author_id ON pull_requests(author_id);
      CREATE INDEX IF NOT EXISTS idx_pull_requests_state_repo ON pull_requests(state, repository_id);
      CREATE INDEX IF NOT EXISTS idx_pull_requests_created_at ON pull_requests(created_at);
      CREATE INDEX IF NOT EXISTS idx_pr_reviews_reviewer_id ON pr_reviews(reviewer_id);
    `
  }
];

export async function runMigrations() {
  console.log('Checking database migrations...');
  
  try {
    // Create schema_migrations table if it doesn't exist
    await execute(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
    
    // Get the current schema version
    const versions = await query<{ version: number }>('SELECT MAX(version) as version FROM schema_migrations');
    const currentVersion = versions[0]?.version || 0;
    
    console.log(`Current database schema version: ${currentVersion}`);
    
    // Apply any pending migrations
    const pendingMigrations = MIGRATIONS.filter(m => m.version > currentVersion);
    
    if (pendingMigrations.length === 0) {
      console.log('Database schema is up to date.');
      return;
    }
    
    console.log(`Applying ${pendingMigrations.length} pending migration(s)...`);
    
    for (const migration of pendingMigrations) {
      console.log(`Applying migration ${migration.version}: ${migration.name}`);
      
      // Split the migration SQL into individual statements and execute them
      const statements = migration.sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);
      
      for (const statement of statements) {
        await execute(`${statement};`);
      }
      
      // Record the migration as applied
      await execute('INSERT INTO schema_migrations (version) VALUES (?)', [migration.version]);
      
      console.log(`Migration ${migration.version} completed successfully.`);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Failed to run migrations:', error);
    return { success: false, error };
  }
}

// Function to seed default categories
export async function seedDefaultCategories() {
  try {
    // Check if we have any categories
    const categories = await query<{ count: number }>('SELECT COUNT(*) as count FROM categories WHERE is_default = 1');
    
    if (categories[0].count === 0) {
      console.log('Seeding default categories...');
      
      // Default categories that will be available to all organizations
      const defaultCategories = [
        { name: 'Bug Fixes', description: 'Fixing issues and bugs', color: '#F87171', is_default: 1 },
        { name: 'Technical Debt', description: 'Improving code quality or refactoring', color: '#FBBF24', is_default: 1 },
        { name: 'New Features', description: 'Adding new functionality', color: '#60A5FA', is_default: 1 },
        { name: 'Product Debt', description: 'Improving user experience', color: '#A78BFA', is_default: 1 },
        { name: 'Documentation', description: 'Improving documentation', color: '#34D399', is_default: 1 },
      ];
      
      for (const category of defaultCategories) {
        await execute(
          `INSERT INTO categories (name, description, color, is_default) VALUES (?, ?, ?, ?)`,
          [category.name, category.description, category.color, category.is_default]
        );
      }
      
      console.log('Default categories seeded successfully.');
    }
    
    return { success: true };
  } catch (error) {
    console.error('Failed to seed default categories:', error);
    return { success: false, error };
  }
} 