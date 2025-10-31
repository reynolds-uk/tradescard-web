'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

// Ensure these env vars exist in Vercel (web project)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Disable pre-render for safety (this is a runtime-only page)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

function CallbackInner() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    (async () => {
      // 1) Exchange the URL (?code=/#access_token=) for a session
      const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);

      // 2) Decide where to send the user next
      const next = params.get('next') || '/account';

      // 3) Optional: surface auth errors via querystring
      if (error) {
        // You could log this if helpful:
        // console.error('Auth callback error:', error.message);
        const url = new URL(next, window.location.origin);
        url.searchParams.set('auth_error', '1');
        router.replace(url.toString());
        return;
      }

      // 4) Clean URL and move on
      router.replace(next);
    })();
  }, [router, params]);

  // Blank shell; Suspense fallback will show while we work
  return null;
}

export default function Page() {
  return (
    <Suspense fallback={<p className="p-6 text-sm opacity-70">Signing you in…</p>}>
      <CallbackInner />
    </Suspense>
  );
}