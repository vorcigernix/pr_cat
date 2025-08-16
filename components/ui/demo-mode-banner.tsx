'use client';

import { useState } from 'react';
import { AlertTriangle, X, Github, Database, Zap } from 'lucide-react';
import { Button } from './button';
import { Alert, AlertDescription } from './alert';
import { Badge } from './badge';

interface DemoModeBannerProps {
  missingServices: string[];
  className?: string;
}

export function DemoModeBanner({ missingServices, className }: DemoModeBannerProps) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <Alert className={`border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 ${className}`}>
      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      <div className="flex items-start justify-between w-full">
        <div className="flex-1">
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            <div className="flex items-center gap-2 mb-2">
              <strong>🎯 Demo Mode Active</strong>
              <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                Sample Data
              </Badge>
            </div>
            
            <p className="mb-3">
              You're viewing sample analytics data. To see your real GitHub data, configure these services:
            </p>
            
            <div className="grid gap-2 sm:grid-cols-3 mb-4">
              {missingServices.includes('GitHub OAuth') && (
                <div className="flex items-center gap-2 p-2 rounded bg-amber-100 dark:bg-amber-900/30">
                  <Github className="h-4 w-4" />
                  <span className="text-sm font-medium">GitHub OAuth</span>
                </div>
              )}
              
              {missingServices.includes('GitHub App') && (
                <div className="flex items-center gap-2 p-2 rounded bg-amber-100 dark:bg-amber-900/30">
                  <Zap className="h-4 w-4" />
                  <span className="text-sm font-medium">GitHub App</span>
                </div>
              )}
              
              {missingServices.includes('Database (Turso)') && (
                <div className="flex items-center gap-2 p-2 rounded bg-amber-100 dark:bg-amber-900/30">
                  <Database className="h-4 w-4" />
                  <span className="text-sm font-medium">Database</span>
                </div>
              )}
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                className="bg-white dark:bg-gray-800 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                onClick={() => window.open('/dashboard/settings', '_self')}
              >
                ⚙️ Configure Services
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                className="bg-white dark:bg-gray-800 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                onClick={() => window.open('https://github.com/vorcigernix/pr_cat#environment-setup', '_blank')}
              >
                📚 Setup Guide
              </Button>
            </div>
          </AlertDescription>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          className="text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 ml-4"
          onClick={() => setIsVisible(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Alert>
  );
}

// Hook to use demo mode info
export function useDemoMode() {
  // This would be populated by your demo mode detection logic
  // For now, returning static data - you'd replace this with actual detection
  
  const missingServices = [];
  
  // Check environment variables (this would run on the server and pass to client)
  if (typeof window !== 'undefined') {
    // Client-side detection based on what features work/don't work
    // You could pass this data from server components
  }
  
  return {
    isDemoMode: true, // This would be dynamic
    missingServices: ['GitHub OAuth', 'Database (Turso)'], // Example
  };
}
