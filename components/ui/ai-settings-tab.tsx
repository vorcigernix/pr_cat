'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { AiSettings as FetchedAiSettings, UpdateAiSettingsPayload } from '@/lib/repositories';
import { Organization } from '@/lib/types';
import { Avatar, AvatarImage, AvatarFallback } from './avatar';
import { allModels, ModelDefinition } from '@/lib/ai-models'; // Import shared models and definition

export function AiSettingsTab() {
  const { data: session, status: sessionStatus } = useSession();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);

  const [fetchedSettings, setFetchedSettings] = useState<FetchedAiSettings | null>(null);
  
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [openaiApiKeyInput, setOpenaiApiKeyInput] = useState('');
  const [googleApiKeyInput, setGoogleApiKeyInput] = useState('');
  const [anthropicApiKeyInput, setAnthropicApiKeyInput] = useState('');

  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (session?.organizations && Array.isArray(session.organizations)) {
      setOrganizations(session.organizations as Organization[]);
    }
  }, [session]);

  useEffect(() => {
    async function fetchSettings() {
      if (!selectedOrganization) return;
      setIsLoadingSettings(true);
      setFetchedSettings(null);
      setSelectedModelId(null);
      setOpenaiApiKeyInput('');
      setGoogleApiKeyInput('');
      setAnthropicApiKeyInput('');
      try {
        const response = await fetch(`/api/organizations/${selectedOrganization.id}/ai-settings`);
        if (!response.ok) {
          throw new Error('Failed to fetch AI settings');
        }
        const data: FetchedAiSettings = await response.json();
        setFetchedSettings(data);
        setSelectedModelId(data.selectedModelId);
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
      setSelectedModelId(null);
      setOpenaiApiKeyInput('');
      setGoogleApiKeyInput('');
      setAnthropicApiKeyInput('');
      setIsLoadingSettings(false);
    }
  }, [selectedOrganization]);

  const currentSelectedModelDetails = selectedModelId ? allModels.find(m => m.id === selectedModelId) : null;

  const handleSave = async () => {
    if (!selectedOrganization) return;
    setIsSaving(true);

    const payload: UpdateAiSettingsPayload = {
      selectedModelId: selectedModelId,
    };

    const modelDetails = selectedModelId ? allModels.find(m => m.id === selectedModelId) : null;

    if (modelDetails) {
      let currentInput = '';
      let apiKeyCurrentlySet = false;
      let apiKeyPayloadKey: keyof UpdateAiSettingsPayload | null = null;

      switch (modelDetails.provider) {
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
      setFetchedSettings(data);
      setSelectedModelId(data.selectedModelId);
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
              <div className="space-y-2">
                <Label htmlFor="ai-model-select">AI Model</Label>
                <Select
                  value={selectedModelId === null ? '__none__' : selectedModelId}
                  onValueChange={(value) => {
                    const newModelId = value === '__none__' ? null : value;
                    setSelectedModelId(newModelId);
                    setOpenaiApiKeyInput('');
                    setGoogleApiKeyInput('');
                    setAnthropicApiKeyInput('');
                  }}
                >
                  <SelectTrigger id="ai-model-select">
                    <SelectValue placeholder="Select a model (or None)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None (Disable AI Categorization)</SelectItem>
                    {allModels.map(model => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.providerName}: {model.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {currentSelectedModelDetails && (
                <div className="space-y-2">
                  <Label htmlFor={`api-key-${currentSelectedModelDetails.provider}`}>
                    {currentSelectedModelDetails.providerName} API Key
                  </Label>
                  <Input
                    id={`api-key-${currentSelectedModelDetails.provider}`}
                    type="password"
                    value={getApiKeyInputProps(currentSelectedModelDetails.provider).value}
                    onChange={getApiKeyInputProps(currentSelectedModelDetails.provider).onChange}
                    placeholder={getApiKeyInputProps(currentSelectedModelDetails.provider).placeholder}
                  />
                  {getApiKeyInputProps(currentSelectedModelDetails.provider).isSet && 
                   !getApiKeyInputProps(currentSelectedModelDetails.provider).value && (
                    <p className="text-xs text-muted-foreground">
                      An API key is currently set for {currentSelectedModelDetails.providerName}.
                      To update it, enter the new key. 
                      To clear this key, leave this field blank and click "Save AI Settings".
                    </p>
                  )}
                   {!getApiKeyInputProps(currentSelectedModelDetails.provider).isSet && 
                    currentSelectedModelDetails.provider && ( // Ensure provider exists to show specific message
                     <p className="text-xs text-muted-foreground">
                      Enter your {currentSelectedModelDetails.providerName} API key.
                    </p>
                   )
                   }
                </div>
              )}
              
              {selectedModelId && !currentSelectedModelDetails && (
                <p className="text-destructive text-xs">Error: Selected model details not found. Please re-select.</p>
              )}

            </CardContent>
            <CardFooter>
              <Button onClick={handleSave} disabled={isSaving || isLoadingSettings || !selectedOrganization}>
                {isSaving ? 'Saving...' : 'Save AI Settings'}
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
} 