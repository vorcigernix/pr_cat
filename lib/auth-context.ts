import { auth } from '@/auth';
import { findUserWithOrganizations } from '@/lib/repositories/user-repository';

// Request-level cache to avoid repeated user queries
const requestCache = new WeakMap<Request, {
  userWithOrganizations?: { user: any; organizations: any[] };
}>();

/**
 * Gets the authenticated user from the session and database
 * @param request Optional request object for caching optimization
 * @returns The authenticated user object from the database
 * @throws Error if user is not authenticated or not found in database
 */
export async function getAuthenticatedUser(request?: Request) {
  const session = await auth();
  
  if (!session || !session.user) {
    throw new Error('Not authenticated');
  }

  // Use request-level caching if request object is provided
  if (request) {
    let cache = requestCache.get(request);
    if (!cache) {
      cache = {};
      requestCache.set(request, cache);
    }

    // Return cached user if available
    if (cache.userWithOrganizations) {
      return cache.userWithOrganizations.user;
    }

    // Fetch and cache user with organizations in a single query
    const result = await findUserWithOrganizations(session.user.id);
    if (!result) {
      throw new Error('User not found in database');
    }

    cache.userWithOrganizations = result;
    return result.user;
  }

  // Fallback to optimized query (for cases where request is not available)
  const result = await findUserWithOrganizations(session.user.id);
  if (!result) {
    throw new Error('User not found in database');
  }

  return result.user;
}

export async function getUserOrganizations(request?: Request) {
  const session = await auth();
  
  if (!session || !session.user) {
    throw new Error('Not authenticated');
  }

  // Use request-level caching
  if (request) {
    let cache = requestCache.get(request);
    if (!cache) {
      cache = {};
      requestCache.set(request, cache);
    }

    // Return cached organizations if available
    if (cache.userWithOrganizations) {
      const organizations = cache.userWithOrganizations.organizations;
      if (!organizations || organizations.length === 0) {
        throw new Error('No organizations found');
      }
      return organizations;
    }

    // Fetch and cache user with organizations in a single query
    const result = await findUserWithOrganizations(session.user.id);
    if (!result) {
      throw new Error('User not found in database');
    }

    if (!result.organizations || result.organizations.length === 0) {
      throw new Error('No organizations found');
    }

    cache.userWithOrganizations = result;
    return result.organizations;
  }

  // Fallback to optimized query
  const result = await findUserWithOrganizations(session.user.id);
  if (!result) {
    throw new Error('User not found in database');
  }

  if (!result.organizations || result.organizations.length === 0) {
    throw new Error('No organizations found');
  }

  return result.organizations;
}

/**
 * Gets the authenticated user along with their organizations in a single optimized query
 * @param request Optional request object for caching optimization
 * @returns Object containing user, organizations array, and primary organization
 * @throws Error if user is not authenticated, not found, or has no organizations
 */
export async function getUserWithOrganizations(request?: Request) {
  const session = await auth();
  
  if (!session || !session.user) {
    throw new Error('Not authenticated');
  }

  // Use request-level caching
  if (request) {
    let cache = requestCache.get(request);
    if (!cache) {
      cache = {};
      requestCache.set(request, cache);
    }

    // Return cached data if available
    if (cache.userWithOrganizations) {
      const { user, organizations } = cache.userWithOrganizations;
      if (!organizations || organizations.length === 0) {
        throw new Error('No organizations found');
      }
      return {
        user,
        organizations,
        primaryOrganization: organizations[0] // Use first org as primary
      };
    }

    // Fetch and cache in a single query
    const result = await findUserWithOrganizations(session.user.id);
    if (!result) {
      throw new Error('User not found in database');
    }

    if (!result.organizations || result.organizations.length === 0) {
      throw new Error('No organizations found');
    }

    cache.userWithOrganizations = result;
    return {
      user: result.user,
      organizations: result.organizations,
      primaryOrganization: result.organizations[0]
    };
  }

  // Fallback to optimized query
  const result = await findUserWithOrganizations(session.user.id);
  if (!result) {
    throw new Error('User not found in database');
  }

  if (!result.organizations || result.organizations.length === 0) {
    throw new Error('No organizations found');
  }

  return {
    user: result.user,
    organizations: result.organizations,
    primaryOrganization: result.organizations[0]
  };
} 