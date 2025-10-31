'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

// Runtime-only: prevent pre-rendering entirely
export const dynamic = 'force-dynamic';
export const revalidate = false;
export const fetchCache = 'force-no-store';
export const dynamicParams = true;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function CallbackInner() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    (async () => {
      // Exchange the URL (?code=/#access_token=) for a session
      const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);

      const next = params.get('next') || '/account';

      if (error) {
        const url = new URL(next, window.location.origin);
        url.searchParams.set('auth_error', '1');
        router.replace(url.toString());
        return;
      }

      router.replace(next);
    })();
  }, [router, params]);

  return null;
}

export default function Page() {
  return (
    <Suspense fallback={<p className="p-6 text-sm opacity-70">Signing you in…</p>}>
      <CallbackInner />
    </Suspense>
  );
}