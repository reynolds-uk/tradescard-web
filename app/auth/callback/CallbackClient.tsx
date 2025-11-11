"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

export default function CallbackClient() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(
    () =>
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // Supabase OAuth/PKCE or magic-link callback (if any still target this route)
        const { error: exErr } = await supabase.auth.exchangeCodeForSession(window.location.href);
        if (exErr) throw exErr;

        // Optional: honour an explicit return_to param
        const returnTo = params.get("return_to");

        // If they had picked a plan prior to auth, complete that intent
        let plan = null as null | "member" | "pro";
        try {
          const v = localStorage.getItem("join_wanted_plan");
          if (v === "member" || v === "pro") plan = v;
          localStorage.removeItem("join_wanted_plan");
        } catch {}

        const dest =
          returnTo ||
          (plan ? `/join?plan=${plan}&open=1` : "/welcome");

        if (!cancelled) router.replace(dest);
      } catch (e: any) {
        setError(e?.message || "We couldn’t finish sign-in.");
        // Gentle nudge after a pause
        setTimeout(() => {
          if (!cancelled) router.replace("/join?mode=signin&error=server_error");
        }, 1500);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, supabase, params]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-2 text-xs text-neutral-500" aria-live="polite">
      {error ? error : "Signing you in…"}
    </div>
  );
}