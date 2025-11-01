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
      // Where to go once we’ve signed the user in
      const next = (params.get('next') || '/account') as Route;

      // Helper: redirect with an error flag
      const sendError = (reason: string) => {
        const url = new URL(next, window.location.origin);
        url.searchParams.set('auth_error', reason);
        router.replace((url.pathname + url.search) as Route);
      };

      try {
        // 1) OAuth flow (?code=...)
        const code = params.get('code');
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) return sendError('1');
          return router.replace(next);
        }

        // 2) Magic Link flow (?token_hash=...&type=magiclink) – can arrive via query or hash
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        const tokenHash = params.get('token_hash') || hashParams.get('token_hash');
        const type =
          (params.get('type') as 'magiclink' | 'recovery' | 'invite' | null) ||
          (hashParams.get('type') as 'magiclink' | 'recovery' | 'invite' | null);

        if (tokenHash && type) {
          const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
          if (error) return sendError('1');
          return router.replace(next);
        }

        // 3) Nothing we can use
        return sendError('missing_token');
      } catch {
        return sendError('unexpected');
      }
    })();
  }, [router, params]);

  return null;
}