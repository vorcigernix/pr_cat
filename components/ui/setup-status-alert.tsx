"use client";

import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

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
        <span>Your Pandora setup is incomplete. Complete the setup to enable PR categorization.</span>
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