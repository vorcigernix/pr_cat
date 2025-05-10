'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, GitPullRequest, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar } from '@/components/ui/avatar';

// Use a simplified interface that contains just what we need for this component
export interface WebhookRepository {
  id: number;
  github_id: number;
  name: string;
  full_name: string;
  description: string | null;
  is_tracked: boolean;
  private: boolean;
  // Optional fields from the full Repository interface that may be present
  organization_id?: number;
  created_at?: string;
  updated_at?: string;
}

interface WebhookConfigProps {
  repository: WebhookRepository;
  onWebhookToggle: (repository: WebhookRepository, newState: boolean) => Promise<void>;
}

export function GitHubWebhookConfig({ repository, onWebhookToggle }: WebhookConfigProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isTracked, setIsTracked] = useState(repository.is_tracked);

  async function handleWebhookToggle() {
    setIsLoading(true);
    try {
      await onWebhookToggle(repository, !isTracked);
      setIsTracked(!isTracked);
      toast.success(
        isTracked
          ? `Stopped tracking ${repository.name}`
          : `Now tracking ${repository.name}`
      );
    } catch (error) {
      toast.error(`Failed to ${isTracked ? 'stop' : 'start'} tracking: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  }

  const [org, repo] = repository.full_name.split('/');

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex flex-col space-y-1.5">
          <CardTitle className="text-lg">{repository.name}</CardTitle>
          <CardDescription className="flex items-center">
            <span className="inline-flex items-center">
              {repository.full_name}
            </span>
            {repository.private && (
              <Badge variant="outline" className="ml-2">Private</Badge>
            )}
          </CardDescription>
        </div>
        <Avatar className="h-9 w-9">
          <div className="flex h-full w-full items-center justify-center bg-muted">
            <GitPullRequest className="h-5 w-5" />
          </div>
        </Avatar>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center">
            <div className="mr-2">
              {isTracked ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-amber-500" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium">
                {isTracked ? 'Webhook active' : 'Not tracking PRs'}
              </p>
              <p className="text-xs text-muted-foreground">
                {isTracked
                  ? 'Real-time updates for PRs and reviews'
                  : 'Add webhook to get real-time data'}
              </p>
            </div>
          </div>
        </div>
        
        {repository.description && (
          <p className="text-sm text-muted-foreground mt-4 line-clamp-2">
            {repository.description}
          </p>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleWebhookToggle} 
          variant={isTracked ? "destructive" : "default"}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
          {isTracked ? 'Stop Tracking' : 'Start Tracking'}
        </Button>
      </CardFooter>
    </Card>
  );
} 