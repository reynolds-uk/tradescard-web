'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Route } from 'next';
import { createClient } from '@supabase/supabase-js';

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
      const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);

      const next = (params.get('next') || '/account') as Route;

      if (error) {
        const url = new URL(next, window.location.origin);
        url.searchParams.set('auth_error', '1');
        const path = (url.pathname + url.search) as Route;
        router.replace(path);
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