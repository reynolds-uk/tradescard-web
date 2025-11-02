// app/offers/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://tradescard-api.vercel.app";

export default function PublicOffersPage() {
  const router = useRouter();
  const supabase = useMemo(
    () =>
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let aborted = false;

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const user = data?.session?.user ?? null;
        if (!user) return;

        const r = await fetch(
          `${API_BASE}/api/account?user_id=${encodeURIComponent(user.id)}`,
          { cache: "no-store" }
        );
        if (!r.ok) return;
        const a = await r.json();
        const tier = (a?.members?.tier as string) ?? "access";
        const status = a?.members?.status ?? "free";
        const eligible = tier !== "access" && status === "active";
        if (!aborted && eligible) router.replace("/member/offers");
      } finally {
        if (!aborted) setChecking(false);
      }
    })();

    return () => {
      aborted = true;
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

      {/* Keep a lightweight skeleton while we check session */}
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