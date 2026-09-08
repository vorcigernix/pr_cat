-- Preserve every displaced value before enforcing one setting per user or organization.
-- The runtime migration runner executes this entire migration in one native write batch.
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

INSERT INTO settings_duplicates_v6_archive
  (original_setting_id, user_id, organization_id, key, value, created_at, updated_at)
SELECT id, user_id, organization_id, key, value, created_at, updated_at
FROM (
  SELECT settings.*, ROW_NUMBER() OVER (
    PARTITION BY user_id, organization_id, key
    ORDER BY julianday(updated_at) DESC, id DESC
  ) AS duplicate_rank
  FROM settings
) WHERE duplicate_rank > 1;

DELETE FROM settings WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY user_id, organization_id, key
      ORDER BY julianday(updated_at) DESC, id DESC
    ) AS duplicate_rank
    FROM settings
  ) WHERE duplicate_rank > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_settings_organization_key
  ON settings(organization_id, key) WHERE user_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_settings_user_key
  ON settings(user_id, key) WHERE organization_id IS NULL;
