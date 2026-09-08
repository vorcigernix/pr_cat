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

-- Successful repository synchronization checkpoints (also applied by migration 007).
CREATE TABLE IF NOT EXISTS repository_sync_state (
  repository_id INTEGER PRIMARY KEY REFERENCES repositories(id) ON DELETE CASCADE,
  updated_through TEXT NOT NULL,
  last_synced_at TEXT NOT NULL
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
  FOREIGN KEY (repository_id) REFERENCES repositories(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  UNIQUE (repository_id, number)
);

-- Dashboard date ranges and repository activity (also applied by migration 005).
CREATE INDEX IF NOT EXISTS idx_pull_requests_repo_created_at ON pull_requests(repository_id, created_at);
CREATE INDEX IF NOT EXISTS idx_pull_requests_repo_state_merged_at ON pull_requests(repository_id, state, merged_at);

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

-- Nullable scope columns require separate uniqueness constraints (migration 006).
CREATE UNIQUE INDEX IF NOT EXISTS idx_settings_organization_key
  ON settings(organization_id, key) WHERE user_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_settings_user_key
  ON settings(user_id, key) WHERE organization_id IS NULL;

-- Original values displaced during the migration are retained without cascading deletes.
CREATE TABLE IF NOT EXISTS settings_duplicates_v6_archive (
  archive_id INTEGER PRIMARY KEY,
  original_setting_id INTEGER NOT NULL,
  user_id TEXT,
  organization_id INTEGER,
  key TEXT NOT NULL,
  value TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT NOT NULL DEFAULT (datetime('now'))
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

-- Create initial schema version
INSERT INTO schema_migrations (version) VALUES (1);
