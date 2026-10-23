import { beforeEach, expect, it, mock } from 'bun:test';

mock.module('@/lib/db', () => ({ query: mock(), batch: mock() }));

const { batch, query } = await import('@/lib/db');
const { getOrganizationAiSettings } = await import('@/lib/repositories/settings-repository');

beforeEach(() => {
  mock.clearAllMocks();
});

it.each([
  ['google', 'gemini-2.5-pro-preview-05-06', 'gemini-2.5-pro'],
  ['google', 'gemini-3.8-flash', 'gemini-3.8-flash'],
  ['google', 'gemini-3.5-flash', 'gemini-3.5-flash'],
  ['google', 'gemini-2.5-pro', 'gemini-2.5-pro'],
  ['google', '__none__', '__none__'],
  ['google', null, null],
  ['openai', 'gpt-4o', 'gpt-4o'],
  [null, null, null],
])('resolves saved %s model %s to %s without rewriting settings', async (provider, model, expected) => {
  const settings: Record<string, string | null> = {
    ai_provider: provider,
    ai_selected_model_id: model,
  };
  (query as ReturnType<typeof mock>).mockResolvedValue(Object.entries(settings).map(([key, value]) => ({ key, value })));

  const result = await getOrganizationAiSettings(1);

  expect(result).toMatchObject({ provider, selectedModelId: expected });
  expect(query).toHaveBeenCalledTimes(1);
  expect(batch).not.toHaveBeenCalled();
});

it('loads only the six organization settings in one query and keeps missing defaults', async () => {
  (query as ReturnType<typeof mock>).mockResolvedValue([]);

  expect(await getOrganizationAiSettings(42)).toEqual({
    provider: null,
    selectedModelId: null,
    isOpenAiKeySet: false,
    isGoogleKeySet: false,
    isAnthropicKeySet: false,
    categoryThreshold: 80,
  });
  expect(query).toHaveBeenCalledTimes(1);

});

it.each([['0', 0], ['42.5', 42.5], ['', 80]])('preserves threshold %s and exposes key presence without secret values', async (storedThreshold, expectedThreshold) => {
  (query as ReturnType<typeof mock>).mockResolvedValue([
    { key: 'ai_openai_api_key', value: '' },
    { key: 'ai_google_api_key', value: 'test-secret-sentinel' },
    { key: 'ai_anthropic_api_key', value: null },
    { key: 'ai_category_threshold', value: storedThreshold },
  ]);

  const result = await getOrganizationAiSettings(1);

  expect(result).toMatchObject({
    isOpenAiKeySet: false,
    isGoogleKeySet: true,
    isAnthropicKeySet: false,
    categoryThreshold: expectedThreshold,
  });
  expect(JSON.stringify(result)).not.toContain('test-secret-sentinel');
});
