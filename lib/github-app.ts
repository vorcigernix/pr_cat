import jwt from 'jsonwebtoken';
import { GitHubClient } from './github';

// Token cache to store installation tokens with expiration times
interface CachedToken {
  token: string;
  expiresAt: number; // Unix timestamp in ms when token expires
}

// In-memory cache for installation tokens
// In a production environment, you might want to use a distributed cache like Redis
const tokenCache: Map<number, CachedToken> = new Map();

/**
 * Generate a GitHub App JWT token used for authenticating as the GitHub App
 */
export async function generateAppJwt(): Promise<string> {
  const appId = process.env.GITHUB_APP_ID;
  
  if (!appId) {
    throw new Error('GitHub App ID (GITHUB_APP_ID) is not configured');
  }

  // For debugging purposes, explicitly define the format of the private key
  // This shows exactly what format is expected
  
  // First try to get the key from environment
  let privateKey = process.env.GITHUB_APP_PRIVATE_KEY;
  
  // Debug only - log length of private key
  console.log(`Private key from env length: ${privateKey?.length || 0}`);
  
  if (privateKey) {
    // Remove any quotes that might have been included
    privateKey = privateKey.replace(/^["']|["']$/g, '');
    
    // Replace escaped newlines with actual newlines
    privateKey = privateKey.replace(/\\n/g, '\n');
  
    console.log('Using private key from environment variables');
  } else {
    console.error('No private key found in environment variables');
    throw new Error('GitHub App private key (GITHUB_APP_PRIVATE_KEY) is not configured');
  }
  
  // JWT expiration (10 minutes maximum)
  const now = Math.floor(Date.now() / 1000);
  
  // Create JWT payload
  const payload = {
    // Issued at time, 60 seconds in the past to allow for clock drift
    iat: now - 60,
    // Expiration time (10 minutes from now)
    exp: now + (10 * 60),
    // GitHub App ID
    iss: appId
  };

  // Sign the JWT with the GitHub App private key
  try {
    // Log the first and last few characters of the key for debugging
    console.log('Key format check:');
    console.log('Starts with:', privateKey.substring(0, 40));
    console.log('Ends with:', privateKey.substring(privateKey.length - 40));
    
    return jwt.sign(payload, privateKey, { algorithm: 'RS256' });
  } catch (error) {
    console.error('Error generating GitHub App JWT:', error);
    throw new Error('Failed to generate GitHub App JWT: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}

/**
 * Get an installation access token for a specific installation ID
 * This implementation includes token caching and revalidation
 */
export async function getInstallationToken(installationId: number): Promise<string> {
  try {
    // Check if we have a valid cached token
    const cachedToken = tokenCache.get(installationId);
    const bufferTimeMs = 5 * 60 * 1000; // 5 minute buffer before expiration
    const now = Date.now();
    
    // Use cached token if it exists and isn't close to expiring
    if (cachedToken && (cachedToken.expiresAt - now > bufferTimeMs)) {
      console.log(`Using cached token for installation ${installationId}, expires in ${Math.floor((cachedToken.expiresAt - now) / 1000 / 60)} minutes`);
      return cachedToken.token;
    }

    // Need to generate a new token
    if (cachedToken) {
      console.log(`Cached token for installation ${installationId} is expired or expiring soon. Generating new token.`);
    } else {
      console.log(`No cached token for installation ${installationId}. Generating new token.`);
    }

    // Generate a new JWT for GitHub App authentication
    const appJwt = await generateAppJwt();
    
    // Create a temporary GitHub client using the app JWT
    const appClient = new GitHubClient(appJwt);
    
    // Exchange the JWT for an installation token
    const token = await appClient.createInstallationAccessToken(installationId);
    
    // Cache the token with its expiration time (GitHub tokens expire in 1 hour)
    const expiresAt = now + (60 * 60 * 1000); // Current time + 1 hour
    tokenCache.set(installationId, {
      token,
      expiresAt
    });
    
    console.log(`Generated and cached new token for installation ${installationId}, expires in 60 minutes`);
    return token;
  } catch (error) {
    console.error('Error getting installation token:', error);
    throw new Error('Failed to get installation token: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}

/**
 * Create a GitHub client authenticated with an installation token
 */
export async function createInstallationClient(installationId: number): Promise<GitHubClient> {
  const token = await getInstallationToken(installationId);
  return new GitHubClient(token, installationId);
}

/**
 * Clear a specific token from the cache if needed
 */
export function clearTokenFromCache(installationId: number): void {
  tokenCache.delete(installationId);
  console.log(`Cleared token cache for installation ${installationId}`);
}

/**
 * Clear all tokens from the cache
 */
export function clearTokenCache(): void {
  tokenCache.clear();
  console.log('Cleared all installation tokens from cache');
} 