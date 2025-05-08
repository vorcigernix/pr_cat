import { NextResponse } from 'next/server';
import { auth } from '@/auth';

export const runtime = 'nodejs';

export async function GET() {
  const session = await auth();
  
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Return session data, but remove any sensitive information
  return NextResponse.json({
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image,
      login: session.user.login,
      html_url: session.user.html_url,
      avatar_url: session.user.avatar_url,
    },
    organizations: session.organizations || [],
    hasAccessToken: !!session.accessToken,
  });
} 