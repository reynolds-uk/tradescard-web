"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://tradescard-api.vercel.app";

export default function PublicBenefitsPage() {
  const router = useRouter();

  const supabase = useMemo<SupabaseClient | null>(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return null;
    return createClient(url, key);
  }, []);

  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        if (!supabase) {
          console.debug("[benefits] no supabase — skip redirect");
          return;
        }

        const { data } = await supabase.auth.getSession();
        const user = data?.session?.user ?? null;
        if (!user) {
          console.debug("[benefits] not signed in — keep public page");
          return;
        }

        const r = await fetch(
          `${API_BASE}/api/account?user_id=${encodeURIComponent(user.id)}`,
          { cache: "no-store" }
        );
        if (!r.ok) {
          console.debug("[benefits] account fetch failed", r.status);
          return;
        }

        const a = await r.json();
        const tier = (a?.members?.tier as string) ?? "access";
        const status = a?.members?.status ?? "free";
        const eligible = tier !== "access" && status === "active";

        console.debug("[benefits] gate", { tier, status, eligible });

        if (!cancelled && eligible) {
          router.replace("/member/benefits");
          setTimeout(() => {
            if (!cancelled && typeof window !== "undefined") {
              window.location.replace("/member/benefits");
            }
          }, 0);
        }
      } finally {
        if (!cancelled) setChecking(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-3xl font-bold">Benefits</h1>
      <p className="mt-2 text-neutral-300">
        Built-in protection and support. Paid members unlock the full set.
      </p>

      {checking ? (
        <div className="mt-6 grid gap-4 md:grid-cols-3" aria-busy="true">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-xl border border-neutral-800 bg-neutral-900 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <p className="mt-6 text-sm text-neutral-400">
          Details launching soon.
        </p>
      )}
    </main>
  );
}