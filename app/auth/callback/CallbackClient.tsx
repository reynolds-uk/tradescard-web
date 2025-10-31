'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Route } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function CallbackClient() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    (async () => {
      const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
      const next = (params.get('next') || '/account') as Route;

      if (error) {
        const url = new URL(next, window.location.origin);
        url.searchParams.set('auth_error', '1');
        router.replace((url.pathname + url.search) as Route);
        return;
      }

      router.replace(next);
    })();
  }, [router, params]);

  return null;
}