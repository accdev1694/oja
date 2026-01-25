import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * Auth Callback Route Handler
 *
 * Handles OAuth and email confirmation redirects from Supabase.
 * Creates user profile if needed and redirects to appropriate page.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/onboarding';

  if (code) {
    const supabase = await createClient();

    // Exchange code for session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Check if profile exists, create if not
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', data.user.id)
        .single();

      if (!profile) {
        // Create profile with 7-day trial
        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + 7);

        await supabase.from('profiles').insert({
          id: data.user.id,
          email: data.user.email!,
          subscription_status: 'trial',
          trial_ends_at: trialEndsAt.toISOString(),
        });
      }

      // Redirect to onboarding or intended destination
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }
  }

  // Something went wrong, redirect to login with error
  return NextResponse.redirect(
    new URL('/login?error=auth_callback_error', requestUrl.origin)
  );
}
