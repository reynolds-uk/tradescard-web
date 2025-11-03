// app/auth/callback/CallbackClient.tsx
"use client";

import { useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

export default function CallbackClient() {
  const router = useRouter();
  const params = useSearchParams();

  const supabase = useMemo(
    () =>
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  useEffect(() => {
    (async () => {
      try {
        // Ensure session is ready
        const { data } = await supabase.auth.getSession();
        const user = data?.session?.user ?? null;

        const next = params.get("next");
        if (next) {
          router.replace(next);
          return;
        }

        // First-login heuristic (client-side flag)
        if (user) {
          const key = `tc:welcome-seen:${user.id}`;
          const seen = localStorage.getItem(key);
          if (!seen) {
            localStorage.setItem(key, "1");
            router.replace("/welcome");
            return;
          }
        }

        router.replace("/account");
      } catch {
        router.replace("/");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}