-- A row exists only after every pull-request and review page has been saved successfully.
CREATE TABLE IF NOT EXISTS repository_sync_state (
  repository_id INTEGER PRIMARY KEY REFERENCES repositories(id) ON DELETE CASCADE,
  updated_through TEXT NOT NULL,
  last_synced_at TEXT NOT NULL
);
