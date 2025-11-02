// app/member/offers/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/src/lib/supabaseClient";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://tradescard-api.vercel.app";

type Offer = {
  id: string;
  name: string;
  blurb?: string | null;
  partner?: string | null;
  thumb_url?: string | null;
  href?: string | null; // external or internal
};

export default function MemberOffersPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabase(), []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [offers, setOffers] = useState<Offer[]>([]);

  useEffect(() => {
    let aborted = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        if (!supabase) {
          setError("Auth not initialised");
          return;
        }
        const { data } = await supabase.auth.getSession();
        const user = data?.session?.user ?? null;
        if (!user) {
          router.push("/join");
          return;
        }

        // 1) Check membership status
        const acc = await fetch(
          `${API_BASE}/api/account?user_id=${encodeURIComponent(user.id)}`,
          { cache: "no-store" }
        );
        if (!acc.ok) throw new Error(`account ${acc.status}`);
        const a = await acc.json();
        const tier = (a?.members?.tier as string) ?? "access";
        const status = a?.members?.status ?? "free";
        const eligible = tier !== "access" && status === "active";
        if (!eligible) {
          router.push("/join");
          return;
        }

        // 2) Load member offers (graceful fallback if not ready server-side)
        const res = await fetch(
          `${API_BASE}/api/offers?user_id=${encodeURIComponent(user.id)}`,
          { cache: "no-store" }
        );

        if (res.ok) {
          const json = await res.json();
          if (!aborted) setOffers(Array.isArray(json) ? json : json?.items ?? []);
        } else {
          // soft fallback (shows page, keeps UX smooth)
          if (!aborted) setError("Could not load offers yet. Please try again shortly.");
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Something went wrong";
        if (!aborted) setError(msg);
      } finally {
        if (!aborted) setLoading(false);
      }
    }

    load();
    return () => {
      aborted = true;
    };
  }, [supabase, router]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold">Member Offers</h1>
        <p className="text-neutral-400">Exclusive and early-access deals for paid members.</p>
      </header>

      {loading && (
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 rounded-xl border border-neutral-800 bg-neutral-900 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="rounded border border-red-600/40 bg-red-900/10 p-3 text-red-300">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="grid gap-4 md:grid-cols-3">
          {offers.length === 0 && (
            <div className="col-span-full text-neutral-400">
              No offers available right now. Check back soon.
            </div>
          )}

          {offers.map((o) => (
            <a
              key={o.id}
              href={o.href || "#"}
              className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 hover:bg-neutral-800"
              target={o.href?.startsWith("http") ? "_blank" : undefined}
              rel={o.href?.startsWith("http") ? "noopener noreferrer" : undefined}
            >
              <div className="text-sm text-neutral-400">{o.partner || "Partner"}</div>
              <div className="font-medium">{o.name}</div>
              {o.blurb && <div className="text-sm text-neutral-400 mt-1">{o.blurb}</div>}
            </a>
          ))}
        </div>
      )}
    </main>
  );
}