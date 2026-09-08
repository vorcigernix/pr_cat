/** @jest-environment node */

import { createClient, type Client } from '@libsql/client';
import { batch, execute, query, transaction } from '@/lib/db';

jest.mock('@libsql/client', () => ({
  ...jest.requireActual('@libsql/client'),
  createClient: jest.fn(),
}));

describe('Native database write transactions', () => {
  let client: Client;
  const originalUrl = process.env.TURSO_URL;
  const originalPoolSize = process.env.TURSO_POOL_SIZE;

  beforeAll(async () => {
    const native = jest.requireActual<typeof import('@libsql/client')>('@libsql/client');
    client = native.createClient({ url: 'file::memory:' });
    jest.mocked(createClient).mockReturnValue(client);
    process.env.TURSO_URL = 'file::memory:';
    process.env.TURSO_POOL_SIZE = '1';
    await client.execute('CREATE TABLE transaction_test (id INTEGER PRIMARY KEY, value TEXT)');
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    await client.execute('DELETE FROM transaction_test');
  });

  afterAll(() => {
    client.close();
    if (originalUrl === undefined) delete process.env.TURSO_URL;
    else process.env.TURSO_URL = originalUrl;
    if (originalPoolSize === undefined) delete process.env.TURSO_POOL_SIZE;
    else process.env.TURSO_POOL_SIZE = originalPoolSize;
  });

  it('uses a native write transaction, preserves callback results and closes the handle', async () => {
    const nativeTransaction = jest.spyOn(client, 'transaction');

    const result = await transaction(async tx => {
      const inserted = await tx.execute('INSERT INTO transaction_test (id, value) VALUES (?, ?)', [0, 'saved']);
      expect(inserted.rowsAffected).toBe(1);
      const rows = await tx.query<{ value: string }>('SELECT value FROM transaction_test WHERE id = ?', [0]);
      return rows[0].value;
    });

    expect(result).toBe('saved');
    expect((await query('SELECT * FROM transaction_test'))).toEqual([expect.objectContaining({ id: 0, value: 'saved' })]);
    expect(nativeTransaction).toHaveBeenCalledWith('write');
    expect((await nativeTransaction.mock.results[0].value).closed).toBe(true);
    nativeTransaction.mockRestore();
  });

  it('rolls back writes when the callback throws and releases the transaction', async () => {
    const failure = new Error('simulated callback failure');

    await expect(transaction(async tx => {
      await tx.execute('INSERT INTO transaction_test (id, value) VALUES (?, ?)', [1, 'unsaved']);
      throw failure;
    })).rejects.toBe(failure);

    expect(await query('SELECT * FROM transaction_test')).toEqual([]);
    await transaction(tx => tx.execute('INSERT INTO transaction_test (id) VALUES (2)'));
    expect((await query('SELECT id FROM transaction_test'))).toEqual([expect.objectContaining({ id: 2 })]);
  });

  it('sends one native write batch and rolls back all statements on a constraint failure', async () => {
    const nativeBatch = jest.spyOn(client, 'batch');
    const statements = [
      { sql: 'INSERT INTO transaction_test (id, value) VALUES (?, ?)', args: [1, 'first'] },
      { sql: 'INSERT INTO transaction_test (id, value) VALUES (?, ?)', args: [1, 'second'] },
    ];

    await expect(batch(statements)).rejects.toThrow(/UNIQUE constraint/);

    expect(nativeBatch).toHaveBeenCalledWith(statements, 'write');
    expect(await query('SELECT * FROM transaction_test')).toEqual([]);
    nativeBatch.mockRestore();
  });

  it('keeps parameter values out of failed-query and failed-write diagnostics', async () => {
    await expect(query('SELECT missing FROM transaction_test WHERE value = ?', ['test-secret-sentinel']))
      .rejects.toThrow('Query failed');
    await expect(execute('INSERT INTO transaction_test (missing) VALUES (?)', ['test-secret-sentinel']))
      .rejects.toThrow('Execute failed');

    const logs = JSON.stringify((console.error as jest.Mock).mock.calls);
    expect(logs).not.toContain('test-secret-sentinel');
    expect(logs).toContain('parameterCount');
  });
});
