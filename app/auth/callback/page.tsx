'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

// runtime-only; never prerender this page
export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function CallbackInner() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    (async () => {
      const { error } =
        await supabase.auth.exchangeCodeForSession(window.location.href);

      const next = params.get('next') || '/account';
      router.replace(error ? '/account?auth_error=1' : next);
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