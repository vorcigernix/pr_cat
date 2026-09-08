import { allModels } from '@/lib/ai-models';

describe('AI model registry', () => {
  it('recommends Gemini 3.8 Flash while keeping supported saved Google models available', () => {
    const googleModels = allModels.filter((model) => model.provider === 'google');

    expect(googleModels).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'gemini-3.8-flash',
          name: 'Gemini 3.8 Flash (Recommended Default)',
          provider: 'google',
          apiKeyPayloadKey: 'googleApiKey',
        }),
        expect.objectContaining({ id: 'gemini-3.5-flash' }),
        expect.objectContaining({ id: 'gemini-2.5-pro' }),
      ])
    );
    expect(googleModels.some((model) => model.id === 'gemini-2.0-flash')).toBe(false);
    expect(googleModels.some((model) => model.id === 'gemini-2.5-pro-preview-05-06')).toBe(false);
  });
});
