import { checkBotId } from 'botid/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Utility function to verify botid and return 403 if request is from a bot
 * @returns Promise<NextResponse | null> - Returns 403 response if bot detected, null if verification passes
 */
export async function verifyBotId(): Promise<NextResponse | null> {
  try {
    // Check if the request is from a bot
    const verification = await checkBotId();
    
    if (verification.isBot) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
    return null; // Verification passed
  } catch (error) {
    console.error('BotId verification error:', error);
    // In case of verification error, allow request to proceed to avoid blocking legitimate users
    return null;
  }
}

/**
 * Higher-order function to wrap API route handlers with botid verification
 */
export function withBotIdVerification<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T
): T {
  return (async (...args: any[]) => {
    // Check for bot before executing the handler
    const botVerification = await verifyBotId();
    if (botVerification) {
      return botVerification;
    }
    
    // If verification passes, execute the original handler
    return await handler(...args);
  }) as T;
}
