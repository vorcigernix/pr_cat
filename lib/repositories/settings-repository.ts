import { query, execute } from '@/lib/db';
import { Setting } from '@/lib/types';

// Old keys (will be replaced or unused for AI settings)
// const AI_PROVIDER_KEY = 'ai_provider';
// const AI_MODEL_ID_KEY = 'ai_model_id';

// New keys for AI settings
const AI_SELECTED_MODEL_ID_KEY = 'ai_selected_model_id';
const AI_OPENAI_API_KEY_KEY = 'ai_openai_api_key';
const AI_GOOGLE_API_KEY_KEY = 'ai_google_api_key'; // Or GEMINI_API_KEY if that naming is preferred
const AI_ANTHROPIC_API_KEY_KEY = 'ai_anthropic_api_key';

// Interface for data returned to the client (keys are not sent)
export interface AiSettings { // Renamed from GetAiSettingsResponse for brevity in frontend
  selectedModelId: string | null;
  isOpenAiKeySet: boolean;
  isGoogleKeySet: boolean;
  isAnthropicKeySet: boolean;
}

// Interface for payload when updating settings (actual keys are sent)
export interface UpdateAiSettingsPayload {
  selectedModelId?: string | null;    // To change the model or disable AI (null)
  openaiApiKey?: string | null;    // To set or clear/remove a key. Null to clear.
  googleApiKey?: string | null;
  anthropicApiKey?: string | null;
}

async function getOrganizationSetting(organizationId: number, key: string): Promise<string | null> {
  const settings = await query<Setting>(
    'SELECT value FROM settings WHERE organization_id = ? AND key = ?',
    [organizationId, key]
  );
  return settings.length > 0 ? settings[0].value : null;
}

async function updateOrganizationSetting(organizationId: number, key: string, value: string | null): Promise<void> {
  // If value is null, we might want to DELETE the setting row or store NULL 
  // depending on desired behavior for "cleared" keys.
  // Storing NULL allows distinguishing between "never set" and "explicitly cleared".
  // For simplicity, current behavior is upsert, so null will store NULL.
  await execute(
    `INSERT INTO settings (organization_id, key, value, created_at, updated_at) 
     VALUES (?, ?, ?, datetime('now'), datetime('now'))
     ON CONFLICT(organization_id, key) DO UPDATE SET 
       value = excluded.value,
       updated_at = datetime('now')`,
    [organizationId, key, value]
  );
}

export async function getOrganizationAiSettings(organizationId: number): Promise<AiSettings> {
  const selectedModelId = await getOrganizationSetting(organizationId, AI_SELECTED_MODEL_ID_KEY);
  const openAiKey = await getOrganizationSetting(organizationId, AI_OPENAI_API_KEY_KEY);
  const googleKey = await getOrganizationSetting(organizationId, AI_GOOGLE_API_KEY_KEY);
  const anthropicKey = await getOrganizationSetting(organizationId, AI_ANTHROPIC_API_KEY_KEY);

  return {
    selectedModelId,
    isOpenAiKeySet: !!openAiKey, // True if key exists and is not empty string (could refine if empty string is valid)
    isGoogleKeySet: !!googleKey,
    isAnthropicKeySet: !!anthropicKey,
  };
}

export async function updateOrganizationAiSettings(
  organizationId: number, 
  payload: UpdateAiSettingsPayload
): Promise<void> {
  if (payload.selectedModelId !== undefined) {
    await updateOrganizationSetting(organizationId, AI_SELECTED_MODEL_ID_KEY, payload.selectedModelId);
  }
  if (payload.openaiApiKey !== undefined) {
    await updateOrganizationSetting(organizationId, AI_OPENAI_API_KEY_KEY, payload.openaiApiKey);
  }
  if (payload.googleApiKey !== undefined) {
    await updateOrganizationSetting(organizationId, AI_GOOGLE_API_KEY_KEY, payload.googleApiKey);
  }
  if (payload.anthropicApiKey !== undefined) {
    await updateOrganizationSetting(organizationId, AI_ANTHROPIC_API_KEY_KEY, payload.anthropicApiKey);
  }
}

// New function to get a specific API key for an organization and provider
export async function getOrganizationApiKey(organizationId: number, provider: 'openai' | 'google' | 'anthropic'): Promise<string | null> {
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
      // Should not happen with TypeScript, but good for safety
      console.error(`Invalid provider specified for getOrganizationApiKey: ${provider}`);
      return null;
  }
  return getOrganizationSetting(organizationId, apiKeyDBKey);
} 