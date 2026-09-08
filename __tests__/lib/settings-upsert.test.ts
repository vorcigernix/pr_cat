/** @jest-environment node */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient, type Client } from '@libsql/client';
import { batch, query } from '@/lib/db';
import { getOrganizationAiSettings, getOrganizationApiKey, updateOrganizationAiSettings } from '@/lib/repositories/settings-repository';

jest.mock('@/lib/db', () => ({ batch: jest.fn(), query: jest.fn() }));

describe('Atomic organization settings saves', () => {
  let client: Client;

  beforeEach(async () => {
    jest.clearAllMocks();
    client = createClient({ url: 'file::memory:' });
    await client.executeMultiple(readFileSync(join(process.cwd(), 'lib/schema.sql'), 'utf8'));
    await client.execute("INSERT INTO organizations (id, name) VALUES (0, 'zero'), (1, 'one')");
    jest.mocked(batch).mockImplementation(statements => client.batch(statements, 'write'));
    jest.mocked(query).mockImplementation(async (sql, args) => (await client.execute({ sql, args })).rows);
  });

  afterEach(() => client.close());

  it('upserts only supplied fields, preserving row identity, nulls, empty strings and zero', async () => {
    await client.execute(`
      INSERT INTO settings (id, organization_id, key, value, created_at, updated_at) VALUES
        (10, 0, 'ai_provider', 'openai', '2020-01-01', '2020-01-01'),
        (11, 0, 'ai_google_api_key', 'test-secret-sentinel', '2020-01-01', '2020-01-01')
    `);
    await updateOrganizationAiSettings(0, {
      provider: 'google', selectedModelId: 'gemini-2.5-pro-preview-05-06',
      openaiApiKey: null, anthropicApiKey: '', categoryThreshold: 0,
    });

    expect(batch).toHaveBeenCalledTimes(1);
    expect(query).not.toHaveBeenCalled();
    const provider = (await client.execute('SELECT * FROM settings WHERE id = 10')).rows[0];
    expect(provider).toMatchObject({ value: 'google', created_at: '2020-01-01' });
    expect(provider.updated_at).not.toBe('2020-01-01');
    expect(await getOrganizationAiSettings(0)).toEqual({
      provider: 'google', selectedModelId: 'gemini-2.5-pro',
      isOpenAiKeySet: false, isGoogleKeySet: true, isAnthropicKeySet: false, categoryThreshold: 0,
    });
    expect(await getOrganizationApiKey(0, 'google')).toBe('test-secret-sentinel');
    const values = await client.execute('SELECT key, value FROM settings WHERE organization_id = 0');
    expect(values.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'ai_openai_api_key', value: null }),
      expect.objectContaining({ key: 'ai_anthropic_api_key', value: '' }),
    ]));

    await updateOrganizationAiSettings(0, { provider: null, selectedModelId: null, googleApiKey: null });
    expect(await getOrganizationApiKey(0, 'google')).toBeNull();
    expect(await getOrganizationAiSettings(0)).toMatchObject({ provider: null, selectedModelId: null, isGoogleKeySet: false });
    expect((await client.execute('SELECT COUNT(*) AS count FROM settings WHERE organization_id = 0')).rows[0].count).toBe(6);
    expect(await getOrganizationAiSettings(1)).toMatchObject({ provider: null, categoryThreshold: 80 });
    const logs = JSON.stringify([(console.log as jest.Mock).mock.calls, (console.error as jest.Mock).mock.calls]);
    expect(logs).not.toContain('test-secret-sentinel');
  });

  it('rolls back earlier fields when a later field fails', async () => {
    await updateOrganizationAiSettings(1, { provider: 'openai', selectedModelId: 'gpt-4o' });
    await client.executeMultiple(`
      CREATE TRIGGER reject_google_key BEFORE INSERT ON settings
      WHEN NEW.key = 'ai_google_api_key'
      BEGIN SELECT RAISE(ABORT, 'simulated settings failure'); END;
    `);

    await expect(updateOrganizationAiSettings(1, {
      provider: 'google', selectedModelId: 'gemini-3.8-flash', googleApiKey: 'test-secret-sentinel',
    })).rejects.toThrow('simulated settings failure');

    expect(await getOrganizationAiSettings(1)).toMatchObject({ provider: 'openai', selectedModelId: 'gpt-4o', isGoogleKeySet: false });
    expect((await client.execute('SELECT COUNT(*) AS count FROM settings')).rows[0].count).toBe(2);
  });

  it('keeps one row per key across overlapping saves', async () => {
    await Promise.all([
      updateOrganizationAiSettings(1, { provider: 'google', selectedModelId: 'gemini-3.8-flash' }),
      updateOrganizationAiSettings(1, { provider: 'openai', selectedModelId: 'gpt-4o' }),
    ]);

    expect((await client.execute('SELECT COUNT(*) AS count FROM settings')).rows[0].count).toBe(2);
    expect(await getOrganizationAiSettings(1)).toMatchObject({ provider: 'openai', selectedModelId: 'gpt-4o' });
  });

  it('does not issue a write for an empty payload', async () => {
    await updateOrganizationAiSettings(1, {});
    expect(batch).not.toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();
  });
});
