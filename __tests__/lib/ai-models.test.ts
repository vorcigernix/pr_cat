import { allModels } from '@/lib/ai-models';

describe('AI model registry', () => {
  it('offers Gemini 3.5 Flash as the recommended Google Flash model', () => {
    const googleModels = allModels.filter((model) => model.provider === 'google');

    expect(googleModels).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'gemini-3.5-flash',
          name: 'Gemini 3.5 Flash (Recommended Default)',
          provider: 'google',
          apiKeyPayloadKey: 'googleApiKey',
        }),
      ])
    );
    expect(googleModels.some((model) => model.id === 'gemini-2.0-flash')).toBe(false);
  });
});
