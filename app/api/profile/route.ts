import { auth } from '@/app/(auth)/auth';
import { db } from '@/lib/db/queries';
import { user } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [userProfile] = await db
      .select({
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        languagePreference: user.languagePreference,
        themePreference: user.themePreference,
      })
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1);

    if (!userProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json(userProfile);
  } catch (error) {
    console.error('Failed to get profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { displayName, languagePreference, themePreference } = body;

    // Validate input
    if (typeof displayName !== 'string' || displayName.length > 100) {
      return NextResponse.json(
        { error: 'Invalid display name' },
        { status: 400 },
      );
    }

    if (!['en', 'es'].includes(languagePreference)) {
      return NextResponse.json(
        { error: 'Invalid language preference' },
        { status: 400 },
      );
    }

    if (!['light', 'dark', 'system'].includes(themePreference)) {
      return NextResponse.json(
        { error: 'Invalid theme preference' },
        { status: 400 },
      );
    }

    // Update user profile
    await db
      .update(user)
      .set({
        displayName: displayName.trim() || null,
        languagePreference,
        themePreference,
      })
      .where(eq(user.id, session.user.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
