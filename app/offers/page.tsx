"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/src/lib/supabaseClient";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://tradescard-api.vercel.app";

export default function PublicOffersPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabase(), []);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let aborted = false;
    let retries = 0;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    async function eligibleRedirect() {
      if (!supabase) return false;
      const { data } = await supabase.auth.getSession();
      const user = data?.session?.user ?? null;
      if (!user) return false;

      const r = await fetch(
        `${API_BASE}/api/account?user_id=${encodeURIComponent(user.id)}`,
        { cache: "no-store" }
      );
      if (!r.ok) return false;

      const a = await r.json();
      const tier = (a?.members?.tier as string) ?? "access";
      const status = a?.members?.status ?? "free";
      const eligible = tier !== "access" && status === "active";

      if (eligible && !aborted) {
        // Try client navigation, then force as a belt-and-braces fallback
        router.replace("/member/offers");
        setTimeout(() => {
          if (typeof window !== "undefined" && window.location.pathname !== "/member/offers") {
            window.location.href = "/member/offers";
          }
        }, 50);
        return true;
      }
      return false;
    }

    async function run() {
      try {
        // quick attempt, then retry (session restore can take a tick)
        for (retries = 0; retries < 5 && !aborted; retries += 1) {
          const ok = await eligibleRedirect();
          if (ok) return;
          await new Promise((res) => (timeoutId = setTimeout(res, 150)));
        }
      } finally {
        if (!aborted) setChecking(false);
      }
    }

    void run();

    // also react to late auth changes
    const listener = supabase?.auth.onAuthStateChange(() => {
      void eligibleRedirect();
    });

    return () => {
      aborted = true;
      if (timeoutId) clearTimeout(timeoutId);
      listener?.data.subscription.unsubscribe();
    };
  }, [router, supabase]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold">Offers</h1>
        <p className="text-neutral-400">
          Curated savings for the trade. Full catalogue for Members/Pro.
        </p>
      </header>

      {checking ? (
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 rounded-xl border border-neutral-800 bg-neutral-900 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="text-neutral-400">
          Coming soon. Join free to get early access.
        </div>
      )}
    </main>
  );
}