import { Suspense } from 'react';
import { GitHubOrganizationManager } from '@/components/ui/github-organization-manager';
import { getOrganizationInstallations } from '@/app/api/services/github-orgs';
import { OrganizationWithInstallation } from '@/components/ui/github-org-setup-item';
import { auth } from '@/auth';

interface OrganizationManagerWrapperProps {
  onOrganizationSelected: (org: OrganizationWithInstallation | null) => void;
  selectedOrganization: OrganizationWithInstallation | null;
}

export default async function OrganizationManagerWrapper({
  onOrganizationSelected,
  selectedOrganization
}: OrganizationManagerWrapperProps) {
  // Check if the user is authenticated
  const session = await auth();

  // Only fetch organizations if we have a session
  if (!session) {
    return (
      <div className="border rounded-lg p-4 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
        <p className="text-amber-800 dark:text-amber-300">
          Please sign in to view and manage your GitHub organizations.
        </p>
      </div>
    );
  }
  
  // Fetch data in the server component
  const organizations = await getOrganizationInstallations();
  
  return (
    <Suspense fallback={<OrganizationManagerSkeleton />}>
      <GitHubOrganizationManager
        initialOrganizations={organizations}
        onOrganizationSelected={onOrganizationSelected}
        selectedOrganization={selectedOrganization}
      />
    </Suspense>
  );
}

function OrganizationManagerSkeleton() {
  return (
    <div className="space-y-2 p-4 border rounded-lg">
      <div className="h-8 w-64 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
      <div className="h-4 w-full bg-gray-200 dark:bg-gray-800 rounded animate-pulse mt-2" />
      <div className="h-24 w-full bg-gray-100 dark:bg-gray-900 rounded animate-pulse mt-4" />
    </div>
  );
} 