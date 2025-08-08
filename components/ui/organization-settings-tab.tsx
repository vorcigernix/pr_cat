'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { OrganizationCategoryManager } from './organization-category-manager';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { Avatar, AvatarImage, AvatarFallback } from './avatar';
import { Button } from './button'; // If needed for styling list items
import { Organization } from '@/lib/types'; // Use the existing Organization type
import type { OrganizationWithInstallation } from '@/components/ui/github-org-setup-item';

interface OrganizationSettingsTabProps {
  organizations: OrganizationWithInstallation[];
  selectedOrganization: OrganizationWithInstallation | null;
}

export function OrganizationSettingsTab({ organizations, selectedOrganization: parentSelectedOrg }: OrganizationSettingsTabProps) {
  const { data: session, status } = useSession();
  const [selectedOrganization, setSelectedOrganization] = useState<OrganizationWithInstallation | null>(null); // Local selection for categories

  // Organizations are now passed as props from parent
  // Set initial selection based on parent's selected organization
  useEffect(() => {
    if (parentSelectedOrg) {
      setSelectedOrganization(parentSelectedOrg);
    }
  }, [parentSelectedOrg]);

  if (status === 'loading') {
    return <p>Loading organization data...</p>;
  }

  if (!session || organizations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Investment Areas</CardTitle>
          <CardDescription>
            No organizations found or you may need to sync your organizations from the GitHub tab.
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
            <CardDescription>Select an organization to manage its categories.</CardDescription>
          </CardHeader>
          <CardContent>
            {organizations.length === 0 && <p>No organizations linked.</p>}
            <ul className="space-y-2">
              {organizations.map((org) => (
                <li key={org.id || org.github_id}> {/* Use org.id, fallback to github_id for key if id is somehow null/0 */}
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
        {selectedOrganization ? (
          <OrganizationCategoryManager 
            organizationId={selectedOrganization.id} 
            organizationName={selectedOrganization.name} 
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Manage Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Please select an organization from the list to manage its investment area categories.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 