import jwt from 'jsonwebtoken';
import { GitHubClient } from './github';

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
 */
export async function getInstallationToken(installationId: number): Promise<string> {
  try {
    const appJwt = await generateAppJwt();
    
    // Create a temporary GitHub client using the app JWT
    const appClient = new GitHubClient(appJwt);
    
    // Exchange the JWT for an installation token
    const token = await appClient.createInstallationAccessToken(installationId);
    
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
  return new GitHubClient(token);
} 