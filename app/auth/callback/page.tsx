'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

// Runtime-only (avoid prerender)
export const dynamic = 'force-dynamic';
export const revalidate = false as const;
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
      // 1) Establish session from the URL params
      const { error } = await supabase.auth.exchangeCodeForSession(
        window.location.href
      );

      // Decide where to send the user next
      const next = (params.get('next') || '/account') as `/${string}`;

      if (error) {
        router.replace(('/account?auth_error=1' as `/${string}`));
        return;
      }

      // 2) Ensure a profile row exists for this user
      const { data: userRes } = await supabase.auth.getUser();
      const user = userRes?.user;

      if (user) {
        // shape this to your actual columns
        const profile = {
          user_id: user.id,                 // FK -> auth.users.id
          email: user.email ?? null,        // optional
          display_name:
            (user.user_metadata as any)?.full_name ??
            user.user_metadata?.name ??
            null,
          updated_at: new Date().toISOString(),
        };

        // upsert on user_id (table must have a unique/PK on user_id)
        await supabase.from('profiles').upsert(profile, { onConflict: 'user_id' });
      }

      // 3) Move on
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