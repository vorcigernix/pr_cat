import type { UpdateAiSettingsPayload, AiSettings as FetchedAiSettings } from "./repositories";

// Shared interface for AI Model Definitions
export interface ModelDefinition {
  id: string; // e.g., "gpt-4o", "gemini-2.0-flash"
  name: string; // User-friendly name, e.g., "GPT-4o (Latest)"
  provider: "openai" | "google" | "anthropic"; // Provider key
  providerName: string; // User-friendly provider name, e.g., "OpenAI"
  apiKeyPayloadKey: keyof UpdateAiSettingsPayload; // Key used in UpdateAiSettingsPayload for this provider's API key
  isKeySetSelector: (settings: FetchedAiSettings | null) => boolean; // Function to check if the API key is set for this provider
}

// Centralized list of all available AI models
export const allModels: ModelDefinition[] = [
  // OpenAI Models
  {
    id: "gpt-4o",
    name: "GPT-4o (Latest)",
    provider: "openai",
    providerName: "OpenAI",
    apiKeyPayloadKey: "openaiApiKey",
    isKeySetSelector: (s) => !!s?.isOpenAiKeySet
  },
  {
    id: "gpt-4-turbo",
    name: "GPT-4 Turbo",
    provider: "openai",
    providerName: "OpenAI",
    apiKeyPayloadKey: "openaiApiKey",
    isKeySetSelector: (s) => !!s?.isOpenAiKeySet
  },
  {
    id: "gpt-3.5-turbo",
    name: "GPT-3.5 Turbo (Fast, Cost-Effective)",
    provider: "openai",
    providerName: "OpenAI",
    apiKeyPayloadKey: "openaiApiKey",
    isKeySetSelector: (s) => !!s?.isOpenAiKeySet
  },
  
  // Google Gemini Models
  {
    id: "gemini-2.5-pro-preview-05-06",
    name: "Gemini 2.5 Pro (Preview, Max Capability)",
    provider: "google",
    providerName: "Google",
    apiKeyPayloadKey: "googleApiKey",
    isKeySetSelector: (s) => !!s?.isGoogleKeySet
  },
  {
    id: "gemini-2.0-flash",
    name: "Gemini 2.0 Flash (Recommended Default)",
    provider: "google",
    providerName: "Google",
    apiKeyPayloadKey: "googleApiKey",
    isKeySetSelector: (s) => !!s?.isGoogleKeySet
  },

  // Anthropic Claude Models
  {
    id: "claude-3.7-sonnet-20250219", // Note: Fictional future date, replace with actual if available
    name: "Claude 3.7 Sonnet (Most Intelligent - Preview)",
    provider: "anthropic",
    providerName: "Anthropic",
    apiKeyPayloadKey: "anthropicApiKey",
    isKeySetSelector: (s) => !!s?.isAnthropicKeySet
  },
  {
    id: "claude-3.5-sonnet-20240620",
    name: "Claude 3.5 Sonnet (Strong Balance)",
    provider: "anthropic",
    providerName: "Anthropic",
    apiKeyPayloadKey: "anthropicApiKey",
    isKeySetSelector: (s) => !!s?.isAnthropicKeySet
  },
  {
    id: "claude-3-opus-20240229",
    name: "Claude 3 Opus (High Capability)",
    provider: "anthropic",
    providerName: "Anthropic",
    apiKeyPayloadKey: "anthropicApiKey",
    isKeySetSelector: (s) => !!s?.isAnthropicKeySet
  },
  {
    id: "claude-3-haiku-20240307",
    name: "Claude 3 Haiku (Fastest)",
    provider: "anthropic",
    providerName: "Anthropic",
    apiKeyPayloadKey: "anthropicApiKey",
    isKeySetSelector: (s) => !!s?.isAnthropicKeySet
  },
]; 