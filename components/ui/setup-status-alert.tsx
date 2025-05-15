"use client";

import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { PrcatLogo } from '@/components/ui/prcat-logo';

interface SetupStatusAlertProps {
  className?: string;
}

export function SetupStatusAlert({ className }: SetupStatusAlertProps) {
  const router = useRouter();
  
  return (
    <Alert variant="warning" className={className}>
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Setup Incomplete</AlertTitle>
      <AlertDescription className="flex justify-between items-center">
        <div className="flex items-center">
          <span>Your </span>
          <PrcatLogo className="mx-1" iconSize="h-3 w-3" fontSize="text-sm" />
          <span> setup is incomplete. Complete the setup to enable PR categorization.</span>
        </div>
        <Button 
          size="sm" 
          onClick={() => router.push('/onboarding')}
          className="ml-4"
        >
          Complete Setup
        </Button>
      </AlertDescription>
    </Alert>
  );
} 