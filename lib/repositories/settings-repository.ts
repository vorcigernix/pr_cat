import { query, execute } from '@/lib/db';
import { Setting } from '@/lib/types';

// Keys for AI settings
const AI_PROVIDER_KEY = 'ai_provider';
const AI_SELECTED_MODEL_ID_KEY = 'ai_selected_model_id';
const AI_OPENAI_API_KEY_KEY = 'ai_openai_api_key';
const AI_GOOGLE_API_KEY_KEY = 'ai_google_api_key';
const AI_ANTHROPIC_API_KEY_KEY = 'ai_anthropic_api_key';

// Valid AI provider values
export type AIProvider = 'openai' | 'google' | 'anthropic' | null;

// Interface for data returned to the client (keys are not sent)
export interface AiSettings {
  provider: AIProvider;
  selectedModelId: string | null;
  isOpenAiKeySet: boolean;
  isGoogleKeySet: boolean;
  isAnthropicKeySet: boolean;
}

// Interface for payload when updating settings (actual keys are sent)
export interface UpdateAiSettingsPayload {
  provider?: AIProvider;
  selectedModelId?: string | null;
  openaiApiKey?: string | null;
  googleApiKey?: string | null;
  anthropicApiKey?: string | null;
}

async function getOrganizationSetting(organizationId: number, key: string): Promise<string | null> {
  const settings = await query<Setting>(
    'SELECT value FROM settings WHERE organization_id = ? AND key = ? AND user_id IS NULL',
    [organizationId, key]
  );
  return settings.length > 0 ? settings[0].value : null;
}

async function updateOrganizationSetting(organizationId: number, key: string, value: string | null): Promise<void> {
  // For organization settings, user_id is always NULL
  // SQLite treats NULL values as distinct, so we need to handle the upsert differently
  
  // First check if a setting already exists
  const existingSetting = await query<Setting>(
    'SELECT id FROM settings WHERE user_id IS NULL AND organization_id = ? AND key = ?',
    [organizationId, key]
  );
  
  if (existingSetting.length > 0) {
    // Update existing setting
    await execute(
      'UPDATE settings SET value = ?, updated_at = datetime(\'now\') WHERE user_id IS NULL AND organization_id = ? AND key = ?',
      [value, organizationId, key]
    );
    console.log(`Updated existing setting ${key} for org ${organizationId} to: ${value}`);
  } else {
    // Insert new setting
    await execute(
      'INSERT INTO settings (user_id, organization_id, key, value, created_at, updated_at) VALUES (NULL, ?, ?, ?, datetime(\'now\'), datetime(\'now\'))',
      [organizationId, key, value]
    );
    console.log(`Inserted new setting ${key} for org ${organizationId} with value: ${value}`);
  }
}

export async function getOrganizationAiSettings(organizationId: number): Promise<AiSettings> {
  const provider = await getOrganizationSetting(organizationId, AI_PROVIDER_KEY) as AIProvider;
  const selectedModelId = await getOrganizationSetting(organizationId, AI_SELECTED_MODEL_ID_KEY);
  const openAiKey = await getOrganizationSetting(organizationId, AI_OPENAI_API_KEY_KEY);
  const googleKey = await getOrganizationSetting(organizationId, AI_GOOGLE_API_KEY_KEY);
  const anthropicKey = await getOrganizationSetting(organizationId, AI_ANTHROPIC_API_KEY_KEY);

  return {
    provider: provider || null,
    selectedModelId,
    isOpenAiKeySet: !!openAiKey,
    isGoogleKeySet: !!googleKey,
    isAnthropicKeySet: !!anthropicKey,
  };
}

export async function updateOrganizationAiSettings(
  organizationId: number, 
  payload: UpdateAiSettingsPayload
): Promise<void> {
  console.log(`Updating AI settings for org ${organizationId}:`, JSON.stringify(payload, null, 2));
  
  if (payload.provider !== undefined) {
    console.log(`Setting provider to: ${payload.provider}`);
    await updateOrganizationSetting(organizationId, AI_PROVIDER_KEY, payload.provider);
  }
  if (payload.selectedModelId !== undefined) {
    console.log(`Setting selectedModelId to: ${payload.selectedModelId}`);
    await updateOrganizationSetting(organizationId, AI_SELECTED_MODEL_ID_KEY, payload.selectedModelId);
  }
  if (payload.openaiApiKey !== undefined) {
    console.log(`Setting OpenAI API key (length: ${payload.openaiApiKey?.length || 0})`);
    await updateOrganizationSetting(organizationId, AI_OPENAI_API_KEY_KEY, payload.openaiApiKey);
  }
  if (payload.googleApiKey !== undefined) {
    console.log(`Setting Google API key (length: ${payload.googleApiKey?.length || 0})`);
    await updateOrganizationSetting(organizationId, AI_GOOGLE_API_KEY_KEY, payload.googleApiKey);
  }
  if (payload.anthropicApiKey !== undefined) {
    console.log(`Setting Anthropic API key (length: ${payload.anthropicApiKey?.length || 0})`);
    await updateOrganizationSetting(organizationId, AI_ANTHROPIC_API_KEY_KEY, payload.anthropicApiKey);
  }
  
  console.log(`Finished updating AI settings for org ${organizationId}`);
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