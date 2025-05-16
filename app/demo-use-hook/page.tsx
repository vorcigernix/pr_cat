"use client";

import { useState } from 'react';
import { OrganizationWithInstallation } from '@/components/ui/github-org-setup-item';
import OrganizationManagerWrapper from '@/app/components/organization-manager-wrapper';

export default function UseHookDemoPage() {
  const [selectedOrganization, setSelectedOrganization] = useState<OrganizationWithInstallation | null>(null);

  const handleOrganizationSelected = (org: OrganizationWithInstallation | null) => {
    setSelectedOrganization(org);
  };

  return (
    <div className="container mx-auto py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">React Use Hook Demo</h1>
        <p className="text-muted-foreground">
          This page demonstrates the React use hook pattern for data fetching.
          The organization data is fetched in a Server Component and streamed to the client.
        </p>
      </div>

      <OrganizationManagerWrapper 
        onOrganizationSelected={handleOrganizationSelected}
        selectedOrganization={selectedOrganization}
      />

      {selectedOrganization && (
        <div className="p-4 border rounded-lg">
          <h2 className="text-xl font-semibold mb-2">Selected Organization</h2>
          <pre className="bg-muted p-4 rounded overflow-auto">
            {JSON.stringify(selectedOrganization, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
} 