import { query, batch } from '@/lib/db';
import { Setting } from '@/lib/types';

// Keys for AI settings
const AI_PROVIDER_KEY = 'ai_provider';
const AI_SELECTED_MODEL_ID_KEY = 'ai_selected_model_id';
const AI_OPENAI_API_KEY_KEY = 'ai_openai_api_key';
const AI_GOOGLE_API_KEY_KEY = 'ai_google_api_key';
const AI_ANTHROPIC_API_KEY_KEY = 'ai_anthropic_api_key';
const AI_CATEGORY_THRESHOLD_KEY = 'ai_category_threshold';

// Valid AI provider values
export type AIProvider = 'openai' | 'google' | 'anthropic' | null;

// Interface for data returned to the client (keys are not sent)
export interface AiSettings {
  provider: AIProvider;
  selectedModelId: string | null;
  isOpenAiKeySet: boolean;
  isGoogleKeySet: boolean;
  isAnthropicKeySet: boolean;
  categoryThreshold: number; // 0-100, confidence threshold for PR categorization
}

// Interface for payload when updating settings (actual keys are sent)
export interface UpdateAiSettingsPayload {
  provider?: AIProvider;
  selectedModelId?: string | null;
  openaiApiKey?: string | null;
  googleApiKey?: string | null;
  anthropicApiKey?: string | null;
  categoryThreshold?: number;
}

async function getOrganizationSetting(organizationId: number, key: string): Promise<string | null> {
  const settings = await query<Setting>(
    'SELECT value FROM settings WHERE organization_id = ? AND key = ? AND user_id IS NULL',
    [organizationId, key]
  );
  return settings.length > 0 ? settings[0].value : null;
}

export async function getOrganizationAiSettings(organizationId: number): Promise<AiSettings> {
  const keys = [AI_PROVIDER_KEY, AI_SELECTED_MODEL_ID_KEY, AI_OPENAI_API_KEY_KEY, AI_GOOGLE_API_KEY_KEY, AI_ANTHROPIC_API_KEY_KEY, AI_CATEGORY_THRESHOLD_KEY];
  const settings = await query<Pick<Setting, 'key' | 'value'>>(
    `SELECT key, value FROM settings WHERE organization_id = ? AND user_id IS NULL AND key IN (${keys.map(() => '?').join(', ')})`,
    [organizationId, ...keys]
  );
  const [provider, selectedModelId, openAiKey, googleKey, anthropicKey, threshold] = keys.map(
    key => settings.find(setting => setting.key === key)?.value ?? null
  );

  return {
    provider: (provider || null) as AIProvider,
    // Resolve the retired preview without changing valid saved selections.
    selectedModelId: provider === 'google' && selectedModelId === 'gemini-2.5-pro-preview-05-06'
      ? 'gemini-2.5-pro'
      : selectedModelId,
    isOpenAiKeySet: !!openAiKey,
    isGoogleKeySet: !!googleKey,
    isAnthropicKeySet: !!anthropicKey,
    categoryThreshold: threshold ? parseFloat(threshold) : 80, // Default to 80% confidence
  };
}

export async function updateOrganizationAiSettings(
  organizationId: number, 
  payload: UpdateAiSettingsPayload
): Promise<void> {
  const values: [string, string | null | undefined][] = [
    [AI_PROVIDER_KEY, payload.provider],
    [AI_SELECTED_MODEL_ID_KEY, payload.selectedModelId],
    [AI_OPENAI_API_KEY_KEY, payload.openaiApiKey],
    [AI_GOOGLE_API_KEY_KEY, payload.googleApiKey],
    [AI_ANTHROPIC_API_KEY_KEY, payload.anthropicApiKey],
    [AI_CATEGORY_THRESHOLD_KEY, payload.categoryThreshold?.toString()],
  ];
  const statements = values.filter(([, value]) => value !== undefined).map(([key, value]) => ({
    sql: `INSERT INTO settings (organization_id, key, value) VALUES (?, ?, ?)
          ON CONFLICT (organization_id, key) WHERE user_id IS NULL
          DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
    args: [organizationId, key, value ?? null],
  }));
  if (statements.length > 0) await batch(statements);
}

// Get a specific API key for an organization and provider
export async function getOrganizationApiKey(organizationId: number, provider: AIProvider): Promise<string | null> {
  if (!provider) return null;
  
  let apiKeyDBKey = '';
  switch (provider) {
    case 'openai':
      apiKeyDBKey = AI_OPENAI_API_KEY_KEY;
      break;
    case 'google':
      apiKeyDBKey = AI_GOOGLE_API_KEY_KEY;
      break;
    case 'anthropic':
      apiKeyDBKey = AI_ANTHROPIC_API_KEY_KEY;
      break;
    default:
      console.error(`Invalid provider specified for getOrganizationApiKey: ${provider}`);
      return null;
  }
  return getOrganizationSetting(organizationId, apiKeyDBKey);
}
