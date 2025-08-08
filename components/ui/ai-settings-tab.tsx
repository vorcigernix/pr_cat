'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { AiSettings as FetchedAiSettings, UpdateAiSettingsPayload } from '@/lib/repositories';
import { AIProvider } from '@/lib/repositories/settings-repository';
import { Organization } from '@/lib/types';
import type { OrganizationWithInstallation } from '@/components/ui/github-org-setup-item';
import { Avatar, AvatarImage, AvatarFallback } from './avatar';
import { allModels, ModelDefinition } from '@/lib/ai-models';

interface AiSettingsTabProps {
  organizations: OrganizationWithInstallation[];
  selectedOrganization: OrganizationWithInstallation | null;
}

export function AiSettingsTab({ organizations, selectedOrganization: parentSelectedOrg }: AiSettingsTabProps) {
  const { data: session, status: sessionStatus } = useSession();
  const [selectedOrganization, setSelectedOrganization] = useState<OrganizationWithInstallation | null>(null);

  const [fetchedSettings, setFetchedSettings] = useState<FetchedAiSettings | null>(null);
  
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>(null);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [openaiApiKeyInput, setOpenaiApiKeyInput] = useState('');
  const [googleApiKeyInput, setGoogleApiKeyInput] = useState('');
  const [anthropicApiKeyInput, setAnthropicApiKeyInput] = useState('');
  const [categoryThreshold, setCategoryThreshold] = useState<number>(80);

  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Filter models by selected provider
  const availableModels = selectedProvider 
    ? allModels.filter(model => model.provider === selectedProvider)
    : [];

  // Organizations are now passed as props from parent
  // Set initial selection based on parent's selected organization
  useEffect(() => {
    if (parentSelectedOrg) {
      setSelectedOrganization(parentSelectedOrg);
    }
  }, [parentSelectedOrg]);

  useEffect(() => {
    async function fetchSettings() {
      if (!selectedOrganization) return;
      setIsLoadingSettings(true);
      setFetchedSettings(null);
      setSelectedProvider(null);
      setSelectedModelId(null);
      setOpenaiApiKeyInput('');
      setGoogleApiKeyInput('');
      setAnthropicApiKeyInput('');
      setCategoryThreshold(80);
      try {
        const response = await fetch(`/api/organizations/${selectedOrganization.id}/ai-settings`);
        if (!response.ok) {
          throw new Error('Failed to fetch AI settings');
        }
        const data: FetchedAiSettings = await response.json();
        console.log('Fetched AI settings:', data);
        setFetchedSettings(data);
        setSelectedProvider(data.provider);
        setSelectedModelId(data.selectedModelId);
        setCategoryThreshold(data.categoryThreshold);
        console.log('Set provider to:', data.provider, 'and model to:', data.selectedModelId);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Could not load AI settings.');
      } finally {
        setIsLoadingSettings(false);
      }
    }
    if (selectedOrganization?.id) {
      fetchSettings();
    } else {
      setFetchedSettings(null);
      setSelectedProvider(null);
      setSelectedModelId(null);
      setOpenaiApiKeyInput('');
      setGoogleApiKeyInput('');
      setAnthropicApiKeyInput('');
      setCategoryThreshold(80);
      setIsLoadingSettings(false);
    }
  }, [selectedOrganization]);

  // When provider changes, reset model selection (but not when loading from server)
  useEffect(() => {
    if (selectedProvider && !isLoadingSettings) {
      // Check if current selected model is from the new provider
      const currentModelMatchesProvider = selectedModelId && 
        allModels.some(m => m.id === selectedModelId && m.provider === selectedProvider);
      
      // If not, clear the model selection
      if (!currentModelMatchesProvider) {
        setSelectedModelId(null);
      }
    }
  }, [selectedProvider, isLoadingSettings]);

  // Debug state changes
  useEffect(() => {
    console.log('State changed - Provider:', selectedProvider, 'Model:', selectedModelId, 'Loading:', isLoadingSettings, 'Available models:', availableModels.length);
  }, [selectedProvider, selectedModelId, isLoadingSettings, availableModels]);

  const handleSave = async () => {
    if (!selectedOrganization) return;
    setIsSaving(true);

    console.log('Save started with state - Provider:', selectedProvider, 'Model:', selectedModelId);

    const payload: UpdateAiSettingsPayload = {
      provider: selectedProvider,
      selectedModelId: selectedModelId,
      categoryThreshold: categoryThreshold,
    };

    // Handle API key changes based on provider
    if (selectedProvider) {
      let currentInput = '';
      let apiKeyCurrentlySet = false;
      let apiKeyPayloadKey: keyof UpdateAiSettingsPayload | null = null;

      switch (selectedProvider) {
        case 'openai':
          currentInput = openaiApiKeyInput;
          apiKeyCurrentlySet = !!fetchedSettings?.isOpenAiKeySet;
          apiKeyPayloadKey = 'openaiApiKey';
          break;
        case 'google':
          currentInput = googleApiKeyInput;
          apiKeyCurrentlySet = !!fetchedSettings?.isGoogleKeySet;
          apiKeyPayloadKey = 'googleApiKey';
          break;
        case 'anthropic':
          currentInput = anthropicApiKeyInput;
          apiKeyCurrentlySet = !!fetchedSettings?.isAnthropicKeySet;
          apiKeyPayloadKey = 'anthropicApiKey';
          break;
      }

      if (apiKeyPayloadKey) {
        let keyForPayload: string | null | undefined = undefined;

        if (currentInput) { // User typed something
          keyForPayload = currentInput;
        } else { // Input is blank
          if (apiKeyCurrentlySet) { // Key was set, and input is now blank
            keyForPayload = null; // Send null to clear
          }
          // If input is blank AND key was NOT set, keyForPayload remains undefined
        }

        // Only add to payload if keyForPayload is a string or null (but not undefined)
        if (keyForPayload !== undefined) {
          payload[apiKeyPayloadKey] = keyForPayload;
        }
      }
    }

    console.log('Save payload being sent:', JSON.stringify(payload, null, 2));

    try {
      const response = await fetch(`/api/organizations/${selectedOrganization.id}/ai-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save AI settings');
      }
      toast.success('AI settings saved successfully!');
      const fetchResponse = await fetch(`/api/organizations/${selectedOrganization.id}/ai-settings`);
      const data: FetchedAiSettings = await fetchResponse.json();
      console.log('After save, fetched AI settings:', data);
      setFetchedSettings(data);
      setSelectedProvider(data.provider);
      setSelectedModelId(data.selectedModelId);
      setCategoryThreshold(data.categoryThreshold);
      console.log('After save, set provider to:', data.provider, 'and model to:', data.selectedModelId);
      setOpenaiApiKeyInput(''); 
      setGoogleApiKeyInput('');
      setAnthropicApiKeyInput('');

    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save AI settings.');
    } finally {
      setIsSaving(false);
    }
  };
  
  const getApiKeyInputProps = (provider: 'openai' | 'google' | 'anthropic') => {
    let value = '';
    let onChange: (e: React.ChangeEvent<HTMLInputElement>) => void = () => {};
    let isSet = false;
    let placeholder = 'Enter API Key';

    if (provider === 'openai') {
      value = openaiApiKeyInput;
      onChange = (e) => setOpenaiApiKeyInput(e.target.value);
      isSet = !!fetchedSettings?.isOpenAiKeySet;
    } else if (provider === 'google') {
      value = googleApiKeyInput;
      onChange = (e) => setGoogleApiKeyInput(e.target.value);
      isSet = !!fetchedSettings?.isGoogleKeySet;
    } else if (provider === 'anthropic') {
      value = anthropicApiKeyInput;
      onChange = (e) => setAnthropicApiKeyInput(e.target.value);
      isSet = !!fetchedSettings?.isAnthropicKeySet;
    }
    if (isSet && !value) placeholder = 'API Key is set. Enter new key to update or clear.';
    else if (isSet && value) placeholder = 'Update API Key';

    return { value, onChange, placeholder, isSet };
  };

  // Debug current state
  console.log('Current state - Provider:', selectedProvider, 'Model:', selectedModelId, 'Fetched:', fetchedSettings);

  if (sessionStatus === 'loading') {
    return <p>Loading session data...</p>;
  }

  if (!session || organizations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI Categorization Settings</CardTitle>
          <CardDescription>
            No organizations found. Please sync your organizations from the GitHub tab first.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>Your Organizations</CardTitle>
            <CardDescription>Select an organization to configure its AI settings.</CardDescription>
          </CardHeader>
          <CardContent>
            {organizations.length === 0 && <p>No organizations linked.</p>}
            <ul className="space-y-2">
              {organizations.map((org) => (
                <li key={org.id || org.github_id}>
                  <Button
                    variant={selectedOrganization?.id === org.id ? 'secondary' : 'ghost'}
                    className="w-full justify-start text-left h-auto py-2"
                    onClick={() => setSelectedOrganization(org)}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="size-8">
                        <AvatarImage src={org.avatar_url || undefined} alt={org.name} />
                        <AvatarFallback>{org.name[0]}</AvatarFallback>
                      </Avatar>
                      <span>{org.name}</span>
                    </div>
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="md:col-span-2">
        {!selectedOrganization ? (
          <Card>
            <CardHeader>
              <CardTitle>AI Categorization Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Please select an organization from the list to configure its AI settings.
              </p>
            </CardContent>
          </Card>
        ) : isLoadingSettings ? (
            <p>Loading AI settings for {selectedOrganization.name}...</p>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>AI Settings for {selectedOrganization.name}</CardTitle>
              <CardDescription>
                Select an AI model and provide the necessary API key for automatic pull request categorization. API keys are stored securely per organization.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Provider Selection */}
              <div className="space-y-2">
                <Label htmlFor="provider-select">AI Provider</Label>
                <Select
                  key={`provider-${selectedOrganization.id}`}
                  value={selectedProvider || 'none'}
                  onValueChange={(value) => {
                    console.log('Provider changed to:', value);
                    if (value === 'none') {
                      setSelectedProvider(null);
                    } else {
                      setSelectedProvider(value as AIProvider);
                    }
                  }}
                >
                  <SelectTrigger id="provider-select">
                    <SelectValue placeholder="Select an AI provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Disable AI Categorization)</SelectItem>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="google">Google (Gemini)</SelectItem>
                    <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Model Selection - only shown when provider is selected */}
              {selectedProvider && (
                <div className="space-y-2">
                  <Label htmlFor="model-select">AI Model</Label>
                  <Select
                    key={`model-${selectedOrganization.id}-${selectedProvider}`}
                    value={selectedModelId || 'none'} 
                    onValueChange={(value) => {
                      console.log('Model changed to:', value);
                      setSelectedModelId(value === 'none' ? null : value);
                    }}
                  >
                    <SelectTrigger id="model-select">
                      <SelectValue placeholder={`Select ${selectedProvider} model`} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select a model</SelectItem>
                      {availableModels.map(model => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* API key input - show based on selected provider */}
              {selectedProvider === 'openai' && (
                <div className="space-y-2">
                  <Label htmlFor="openai-key">
                    OpenAI API Key
                    {fetchedSettings?.isOpenAiKeySet && <span className="ml-2 text-xs text-muted-foreground">(Already set)</span>}
                  </Label>
                  <Input
                    id="openai-key"
                    type="password"
                    placeholder={getApiKeyInputProps('openai').placeholder}
                    value={openaiApiKeyInput}
                    onChange={getApiKeyInputProps('openai').onChange}
                  />
                  <p className="text-xs text-muted-foreground">Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline">OpenAI dashboard</a>.</p>
                </div>
              )}
              
              {selectedProvider === 'google' && (
                <div className="space-y-2">
                  <Label htmlFor="google-key">
                    Google AI API Key
                    {fetchedSettings?.isGoogleKeySet && <span className="ml-2 text-xs text-muted-foreground">(Already set)</span>}
                  </Label>
                  <Input
                    id="google-key"
                    type="password"
                    placeholder={getApiKeyInputProps('google').placeholder}
                    value={googleApiKeyInput}
                    onChange={getApiKeyInputProps('google').onChange}
                  />
                  <p className="text-xs text-muted-foreground">Get your API key from <a href="https://ai.google.dev/" target="_blank" rel="noopener noreferrer" className="underline">Google AI Studio</a>.</p>
                </div>
              )}

              {selectedProvider === 'anthropic' && (
                <div className="space-y-2">
                  <Label htmlFor="anthropic-key">
                    Anthropic API Key
                    {fetchedSettings?.isAnthropicKeySet && <span className="ml-2 text-xs text-muted-foreground">(Already set)</span>}
                  </Label>
                  <Input
                    id="anthropic-key"
                    type="password"
                    placeholder={getApiKeyInputProps('anthropic').placeholder}
                    value={anthropicApiKeyInput}
                    onChange={getApiKeyInputProps('anthropic').onChange}
                  />
                  <p className="text-xs text-muted-foreground">Get your API key from <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="underline">Anthropic Console</a>.</p>
                </div>
              )}

              {/* Category Recognition Threshold - only show when provider is selected */}
              {selectedProvider && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="category-threshold">
                      PR Category Recognition Threshold
                    </Label>
                    <div className="space-y-3">
                      <Slider
                        id="category-threshold"
                        min={10}
                        max={100}
                        step={5}
                        value={[categoryThreshold]}
                        onValueChange={(value) => setCategoryThreshold(value[0])}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>10% (Permissive)</span>
                        <span className="font-medium">{categoryThreshold}%</span>
                        <span>100% (Strict)</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      AI confidence threshold for automatic PR categorization. Lower values categorize more PRs but may be less accurate. 
                      Higher values are more selective but more precise. Recommended: 70-90%.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save AI Settings'}
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
} 