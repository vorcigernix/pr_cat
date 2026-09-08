'use client';

import { useState, type FormEvent } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { fetchJson } from '@/lib/fetch-json';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import type { AIProvider, AiSettings as FetchedAiSettings, UpdateAiSettingsPayload } from '@/lib/repositories/settings-repository';
import type { OrganizationWithInstallation } from '@/components/ui/github-org-setup-item';
import { Avatar, AvatarImage, AvatarFallback } from './avatar';
import { allModels } from '@/lib/ai-models';

interface AiSettingsTabProps {
  organizations: OrganizationWithInstallation[];
  selectedOrganization: OrganizationWithInstallation | null;
  onOrganizationSelected: (organization: OrganizationWithInstallation) => void;
}

const providerDetails = {
  openai: { name: 'OpenAI', key: 'openaiApiKey', flag: 'isOpenAiKeySet', url: 'https://platform.openai.com/api-keys' },
  google: { name: 'Google AI', key: 'googleApiKey', flag: 'isGoogleKeySet', url: 'https://ai.google.dev/' },
  anthropic: { name: 'Anthropic', key: 'anthropicApiKey', flag: 'isAnthropicKeySet', url: 'https://console.anthropic.com/' },
} as const;

export function AiSettingsTab({ organizations, selectedOrganization, onOrganizationSelected }: AiSettingsTabProps) {
  const { mutate: mutateCache } = useSWRConfig();
  const endpoint = selectedOrganization ? `/api/organizations/${selectedOrganization.id}/ai-settings` : null;
  const { data: fetchedSettings, error, isLoading, mutate } = useSWR<FetchedAiSettings>(endpoint, fetchJson, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });
  const [draft, setDraft] = useState<{ organizationId: number; values: UpdateAiSettingsPayload } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const changes = draft && draft.organizationId === selectedOrganization?.id ? draft.values : {};
  const selectedProvider = changes.provider !== undefined ? changes.provider : fetchedSettings?.provider ?? null;
  const selectedModelId = changes.selectedModelId !== undefined ? changes.selectedModelId : fetchedSettings?.selectedModelId ?? null;
  const categoryThreshold = changes.categoryThreshold ?? fetchedSettings?.categoryThreshold ?? 80;
  const availableModels = allModels.filter(model => model.provider === selectedProvider);
  const provider = selectedProvider ? providerDetails[selectedProvider] : null;
  const keyValue = provider ? changes[provider.key] : undefined;
  const keyIsSet = provider ? !!fetchedSettings?.[provider.flag] : false;
  const keyPlaceholder = keyValue === null ? 'Key will be removed when you save'
    : keyIsSet ? 'Leave blank to keep the saved key' : 'Enter API Key';

  function updateDraft(values: UpdateAiSettingsPayload) {
    if (!selectedOrganization) return;
    setDraft(current => ({
      organizationId: selectedOrganization.id,
      values: { ...(current?.organizationId === selectedOrganization.id ? current.values : {}), ...values },
    }));
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedOrganization || !fetchedSettings || !endpoint || isSaving) return;
    setIsSaving(true);
    const submittedDraft = draft;
    const payload: UpdateAiSettingsPayload = { provider: selectedProvider, selectedModelId, categoryThreshold };
    if (provider && keyValue !== undefined && keyValue !== '') payload[provider.key] = keyValue;
    let saved = false;

    try {
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save AI settings');
      }
      saved = true;
      await mutateCache(endpoint, fetchJson<FetchedAiSettings>(endpoint), { revalidate: false });
      setDraft(current => current === submittedDraft ? null : current);
      toast.success(`AI settings saved for ${selectedOrganization.name}.`);
    } catch (error) {
      toast.error(saved
        ? `Settings saved for ${selectedOrganization.name}, but reloading failed. Your edits are still shown.`
        : error instanceof Error ? error.message : 'Could not save AI settings.');
    } finally {
      setIsSaving(false);
    }
  }

  if (organizations.length === 0) {
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
            <ul className="space-y-2">
              {organizations.map((org) => (
                <li key={org.id}>
                  <Button
                    variant={selectedOrganization?.id === org.id ? 'secondary' : 'ghost'}
                    className="w-full justify-start text-left h-auto py-2"
                    onClick={() => onOrganizationSelected(org)}
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
        {!selectedOrganization && (
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
        )}
        {selectedOrganization && (isLoading ? (
            <p>Loading AI settings for {selectedOrganization.name}...</p>
        ) : error ? (
          <div role="alert" className="space-y-3">
            <p>Could not load AI settings for {selectedOrganization.name}.</p>
            <Button variant="outline" onClick={() => void mutate()}>Retry</Button>
          </div>
        ) : fetchedSettings ? (
          <Card>
            <form onSubmit={handleSave} className="space-y-6">
            <CardHeader>
              <CardTitle>AI Settings for {selectedOrganization.name}</CardTitle>
              <CardDescription>
                Select an AI model and provide its API key for automatic pull request categorization. These settings apply to the selected organization.
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
                    updateDraft({ provider: value === 'none' ? null : value as AIProvider, selectedModelId: null });
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
                      updateDraft({ selectedModelId: value === 'none' ? null : value });
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

              {provider && (
                <div className="space-y-2">
                  <Label htmlFor="provider-key">
                    {provider.name} API Key
                    {keyIsSet && <span className="ml-2 text-xs text-muted-foreground">(Already set)</span>}
                  </Label>
                  <Input
                    id="provider-key"
                    name={provider.key}
                    type="password"
                    autoComplete="off"
                    aria-describedby="provider-key-help"
                    placeholder={keyPlaceholder}
                    value={keyValue ?? ''}
                    onChange={event => updateDraft({ [provider.key]: event.target.value })}
                  />
                  <p id="provider-key-help" className="text-xs text-muted-foreground">Get your API key from the <a href={provider.url} target="_blank" rel="noopener noreferrer" className="underline">{provider.name} dashboard</a>.</p>
                  {keyIsSet && (
                    <Button type="button" variant="outline" onClick={() => updateDraft({ [provider.key]: null })} disabled={keyValue === null}>
                      Remove saved API key
                    </Button>
                  )}
                  {keyValue === null && <p role="status" className="text-sm text-muted-foreground">The saved key will be removed when you save. Enter a new key to replace it instead.</p>}
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
                        onValueChange={(value) => updateDraft({ categoryThreshold: value[0] })}
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
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save AI Settings'}
              </Button>
            </CardFooter>
            </form>
          </Card>
        ) : null)}
      </div>
    </div>
  );
} 
