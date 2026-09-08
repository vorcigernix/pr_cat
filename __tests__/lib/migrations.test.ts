/** @jest-environment node */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient, type Client } from '@libsql/client';
import { batch, query, execute } from '@/lib/db';
import { CURRENT_SCHEMA_VERSION, runMigrations } from '@/lib/migrate';
import { GET as getStatus } from '@/app/api/status/route';

jest.mock('@/lib/db', () => ({ batch: jest.fn(), query: jest.fn(), execute: jest.fn() }));
jest.mock('@/auth', () => ({ auth: jest.fn(async () => ({ user: { id: 'migration-test' } })) }));

describe('Database migration compatibility', () => {
  let client: Client;

  beforeEach(() => {
    client = createClient({ url: 'file::memory:' });
    jest.mocked(batch).mockImplementation(statements => client.batch(statements, 'write'));
    jest.mocked(query).mockImplementation(async (sql, args) => {
      return (await client.execute({ sql, args })).rows;
    });
    jest.mocked(execute).mockImplementation(async (sql, args) => {
      const result = await client.execute({ sql, args });
      return { rowsAffected: result.rowsAffected };
    });
  });

  afterEach(() => client.close());

  it('initializes a fresh database through the performance indexes and team schema', async () => {
    expect(await runMigrations()).toEqual({ success: true });
    const version = await client.execute('SELECT MAX(version) AS version FROM schema_migrations');
    expect(version.rows[0].version).toBe(CURRENT_SCHEMA_VERSION);
    const indexes = await client.execute("PRAGMA index_list('pull_requests')");
    expect(indexes.rows.map(index => index.name)).toEqual(expect.arrayContaining([
      'idx_pull_requests_created_at',
      'idx_pull_requests_repo_created_at',
      'idx_pull_requests_repo_state_merged_at',
    ]));
    expect((await client.execute('SELECT * FROM teams')).rows).toEqual([]);
    expect((await client.execute('SELECT * FROM repository_sync_state')).rows).toEqual([]);
    const settingsIndexes = await client.execute("PRAGMA index_list('settings')");
    expect(settingsIndexes.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'idx_settings_organization_key', unique: 1, partial: 1 }),
      expect.objectContaining({ name: 'idx_settings_user_key', unique: 1, partial: 1 }),
    ]));
    expect((await (await getStatus()).json()).database.migrationNeeded).toBe(false);
  });

  it.each([
    { columns: [] },
    { columns: ['ai_status'] },
    { columns: ['error_message'] },
    { columns: ['ai_status', 'error_message'] },
  ])('upgrades version 1 with existing columns $columns without losing values', async ({ columns }) => {
    await client.executeMultiple(readFileSync(join(process.cwd(), 'lib/schema.sql'), 'utf8'));
    await client.executeMultiple(`
      DROP INDEX idx_pull_requests_repo_created_at;
      DROP INDEX idx_pull_requests_repo_state_merged_at;
      INSERT INTO repositories (id, name, full_name) VALUES (1, 'repo', 'org/repo');
      INSERT INTO pull_requests (id, github_id, repository_id, number, title, state, created_at, updated_at)
      VALUES (1, 101, 1, 1, 'Existing PR', 'open', '2026-09-01T00:00:00Z', '2026-09-01T00:00:00Z');
    `);
    for (const column of columns) {
      await client.execute(`ALTER TABLE pull_requests ADD COLUMN ${column} TEXT`);
      await client.execute({ sql: `UPDATE pull_requests SET ${column} = ?`, args: [`saved-${column}`] });
    }
    expect((await (await getStatus()).json()).database.migrationNeeded).toBe(true);

    expect(await runMigrations()).toEqual({ success: true });
    await runMigrations();

    expect((await client.execute('SELECT * FROM pull_requests WHERE id = 1')).rows[0]).toMatchObject({
      title: 'Existing PR',
      ai_status: columns.includes('ai_status') ? 'saved-ai_status' : 'pending',
      error_message: columns.includes('error_message') ? 'saved-error_message' : null,
    });
    const version = await client.execute('SELECT MAX(version) AS version, COUNT(*) AS count FROM schema_migrations');
    expect(version.rows[0]).toMatchObject({ version: CURRENT_SCHEMA_VERSION, count: CURRENT_SCHEMA_VERSION });
    expect((await (await getStatus()).json()).database.migrationNeeded).toBe(false);
  });

  it('adds the dashboard indexes to version 4 databases and safely reruns', async () => {
    await runMigrations();
    await client.executeMultiple(`
      DROP INDEX idx_pull_requests_repo_created_at;
      DROP INDEX idx_pull_requests_repo_state_merged_at;
      DELETE FROM schema_migrations WHERE version >= 5;
    `);
    expect((await (await getStatus()).json()).database.migrationNeeded).toBe(true);

    expect(await runMigrations()).toEqual({ success: true });
    await runMigrations();

    const createdIndex = await client.execute("PRAGMA index_info('idx_pull_requests_repo_created_at')");
    expect(createdIndex.rows.map(column => column.name)).toEqual(['repository_id', 'created_at']);
    const mergedIndex = await client.execute("PRAGMA index_info('idx_pull_requests_repo_state_merged_at')");
    expect(mergedIndex.rows.map(column => column.name)).toEqual(['repository_id', 'state', 'merged_at']);
    expect((await (await getStatus()).json()).database.migrationNeeded).toBe(false);
  });

  describe('version 6 settings uniqueness', () => {
    beforeEach(async () => {
      await runMigrations();
      await client.executeMultiple(`
        DROP INDEX idx_settings_organization_key;
        DROP INDEX idx_settings_user_key;
        DROP TABLE settings_duplicates_v6_archive;
        DROP TABLE repository_sync_state;
        DELETE FROM schema_migrations WHERE version >= 6;
        INSERT INTO organizations (id, name) VALUES (0, 'zero'), (1, 'one'), (2, 'two');
        INSERT INTO users (id) VALUES (''), ('u');
        INSERT INTO settings (id, user_id, organization_id, key, value, created_at, updated_at) VALUES
          (1, NULL, 0, 'ai_provider', 'google', '2025-01-01', '2026-09-07 09:00:00'),
          (2, NULL, 0, 'ai_provider', 'openai', '2025-02-01', '2026-09-07T10:00:00+02:00'),
          (3, NULL, 1, 'ai_openai_api_key', NULL, '2025-03-01', '2026-09-07 09:00:00'),
          (4, NULL, 1, 'ai_openai_api_key', '', '2025-04-01', '2026-09-07 09:00:00'),
          (5, '', NULL, 'theme', 'system', '2025-05-01', '2025-09-07 09:00:00'),
          (6, '', NULL, 'theme', 'dark', '2025-06-01', '2026-09-07 09:00:00'),
          (7, 'u', NULL, 'ai_provider', 'openai', '2025-07-01', '2026-09-07 09:00:00'),
          (8, NULL, 2, 'ai_provider', 'anthropic', '2025-08-01', '2026-09-07 09:00:00');
      `);
    });

    it('keeps the latest timestamp then ID, preserving every displaced row and scope', async () => {
      const displaced = await client.execute(`
        SELECT id AS original_setting_id, user_id, organization_id, key, value, created_at, updated_at
        FROM settings WHERE id IN (2, 3, 5) ORDER BY id
      `);

      expect(await runMigrations()).toEqual({ success: true });
      expect((await client.execute('SELECT id FROM settings ORDER BY id')).rows.map(row => row.id))
        .toEqual([1, 4, 6, 7, 8]);
      const archived = await client.execute(`
        SELECT original_setting_id, user_id, organization_id, key, value, created_at, updated_at
        FROM settings_duplicates_v6_archive ORDER BY original_setting_id
      `);
      expect(archived.rows).toEqual(displaced.rows);
      expect((await client.execute('SELECT value FROM settings WHERE id = 4')).rows[0].value).toBe('');
      expect((await client.execute('SELECT * FROM repository_sync_state')).rows).toEqual([]);

      await expect(client.execute("INSERT INTO settings (organization_id, key) VALUES (0, 'ai_provider')"))
        .rejects.toThrow(/UNIQUE constraint/);
      await expect(client.execute("INSERT INTO settings (user_id, key) VALUES ('', 'theme')"))
        .rejects.toThrow(/UNIQUE constraint/);
      await client.execute("INSERT INTO settings (user_id, key, value) VALUES ('u', 'theme', 'light')");

      await runMigrations();
      expect((await client.execute('SELECT COUNT(*) AS count FROM settings_duplicates_v6_archive')).rows[0].count).toBe(3);
      await client.execute('DELETE FROM organizations WHERE id IN (0, 1)');
      expect((await client.execute('SELECT COUNT(*) AS count FROM settings_duplicates_v6_archive')).rows[0].count).toBe(3);
    });

    it('rolls back archiving, deduplication and the version marker on failure, then retries', async () => {
      await client.executeMultiple(`
        CREATE TRIGGER prevent_settings_delete BEFORE DELETE ON settings
        BEGIN SELECT RAISE(ABORT, 'simulated migration failure'); END;
      `);
      const original = await client.execute('SELECT * FROM settings ORDER BY id');

      expect(await runMigrations()).toMatchObject({ success: false });
      expect((await client.execute('SELECT * FROM settings ORDER BY id')).rows).toEqual(original.rows);
      expect((await client.execute('SELECT MAX(version) AS version FROM schema_migrations')).rows[0].version).toBe(5);
      expect((await client.execute("SELECT name FROM sqlite_master WHERE name = 'settings_duplicates_v6_archive'")).rows).toEqual([]);
      expect((await client.execute("PRAGMA index_list('settings')")).rows.map(row => row.name))
        .not.toContain('idx_settings_organization_key');

      await client.execute('DROP TRIGGER prevent_settings_delete');
      expect(await runMigrations()).toEqual({ success: true });
      expect((await client.execute('SELECT COUNT(*) AS count FROM settings_duplicates_v6_archive')).rows[0].count).toBe(3);
      expect((await client.execute('SELECT MAX(version) AS version FROM schema_migrations')).rows[0].version).toBe(CURRENT_SCHEMA_VERSION);
    });
  });
});
