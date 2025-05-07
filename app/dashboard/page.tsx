import { ActionableRecommendations } from "@/components/actionable-recommendations"
import { AppSidebar } from "@/components/app-sidebar"
import { CompactEngineeringMetrics } from "@/components/compact-engineering-metrics"
import { InvestmentAreaDistribution } from "@/components/investment-area-distribution"
import { PRActivityTable } from "@/components/pr-activity-table"
import { SectionCardsEngineering } from "@/components/section-cards-engineering"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { auth } from "@/auth"
import { findUserById, findUserByEmail, createUser, updateUser } from "@/lib/repositories"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function DashboardPage() {
  // Check if user is in database
  const session = await auth();
  
  if (!session || !session.user) {
    redirect('/sign-in');
  }
  
  // Debug session information
  console.log('Session user id:', session.user.id);
  console.log('Session user email:', session.user.email);
  
  let userInDb;
  let needsMigration = false;
  
  try {
    // First check if database needs migration
    try {
      const statusResponse = await fetch(`${process.env.APP_URL || 'http://localhost:3000'}/api/status`);
      const statusData = await statusResponse.json();
      needsMigration = statusData.database?.migrationNeeded;
      console.log('Database status:', statusData);
    } catch (statusError) {
      console.error('Error checking database status:', statusError);
      needsMigration = true;
    }
    
    // If migration is needed, don't try to fetch user data yet
    if (needsMigration) {
      return (
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-semibold mb-2">Database Setup Required</h1>
            <p className="text-muted-foreground mb-6">
              The database schema needs to be initialized before you can use the application.
            </p>
            <Link href="/api/migrate" target="_blank">
              <Button variant="default">Initialize Database</Button>
            </Link>
            <p className="text-xs text-muted-foreground mt-4">
              After initialization completes, return to this page and refresh.
            </p>
          </div>
        </div>
      );
    }
    
    // Only try to find user if migrations have been run
    try {
      // First try to find user by ID
      userInDb = await findUserById(session.user.id);
      console.log('User found in database by ID:', !!userInDb);
      
      // If not found by ID but we have an email, try finding by email
      if (!userInDb && session.user.email) {
        const userByEmail = await findUserByEmail(session.user.email);
        console.log('User found in database by email:', !!userByEmail);
        
        if (userByEmail) {
          // We found a user with the same email but different ID
          // Update the existing user with the new session ID
          console.log('Found user with same email but different ID, updating user');
          
          // Update the user's ID to match the session ID
          // This would require a custom update function or modification to the schema
          // For now, we'll just use the existing user
          userInDb = userByEmail;
        }
      }
    } catch (userLookupError) {
      console.error('Error looking up user:', userLookupError);
      throw userLookupError;
    }
    
    // If user not in DB yet, try to create them
    if (!userInDb) {
      console.log('User not found, attempting to create user');
      
      // Create user if they don't exist yet
      if (session.user.email) {
        try {
          // Try to find user by email one more time (safety check)
          const existingUserByEmail = await findUserByEmail(session.user.email);
          
          if (existingUserByEmail) {
            // User with this email already exists, use that user
            console.log('User with this email already exists, using existing user');
            userInDb = existingUserByEmail;
            
            // Update the user with any new information from the session
            await updateUser(existingUserByEmail.id, {
              name: session.user.name ?? null,
              image: session.user.image ?? null,
            });
          } else {
            // No user with this email, create a new one
            await createUser({
              id: session.user.id,
              name: session.user.name ?? null,
              email: session.user.email,
              image: session.user.image ?? null,
            });
            console.log('User created successfully');
            
            // Check again to confirm user was created
            userInDb = await findUserById(session.user.id);
          }
          
          console.log('User found after creation/update:', !!userInDb);
        } catch (createError) {
          console.error('Failed to create/update user:', createError);
          throw createError;
        }
      }
      
      // Still not found, show loading state
      if (!userInDb) {
        return (
          <div className="flex min-h-screen items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-semibold mb-2">Initializing Dashboard</h1>
              <p className="text-muted-foreground mb-4">
                Setting up your account. This may take a moment...
              </p>
              <div className="mt-4">
                <Link href="/dashboard">
                  <Button variant="outline" size="sm">Retry</Button>
                </Link>
              </div>
            </div>
          </div>
        )
      }
    }
  } catch (error) {
    console.error('Database error:', error);
    // Display error state for database connection
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-2">Database Connection Error</h1>
          <p className="text-muted-foreground mb-4">
            We're having trouble connecting to the database. Please try again later.
          </p>
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Error details: {error instanceof Error ? error.message : 'Unknown error'}
            </p>
            <p className="text-sm mt-4">
              If this is your first time running the application, you may need to initialize the database:
            </p>
            <Link href="/api/migrate" target="_blank">
              <Button variant="outline" size="sm">Run Migrations</Button>
            </Link>
            <div className="mt-4">
              <Link href="/dashboard">
                <Button variant="outline" size="sm">Retry</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Debug info
  console.log('Dashboard rendering with user:', session.user.id);

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6">
                <h1 className="text-2xl font-semibold">Dashboard Overview</h1>
              </div>
              <SectionCardsEngineering />
              <div className="px-4 lg:px-6">
                <ActionableRecommendations />
              </div>
              <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 md:grid-cols-2">
                <CompactEngineeringMetrics />
                <InvestmentAreaDistribution />
              </div>
              <PRActivityTable />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
