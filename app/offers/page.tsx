"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

type Me = {
  user_id: string;
  email: string;
  tier: "access" | "member" | "pro";
  status: string; // active | trialing | past_due | canceled | free
};

type Offer = {
  id: string;
  category: string;
  title: string;
  partner?: string | null;
  code?: string | null;
  link?: string | null;
  visibility?: "public" | "access" | "member" | "pro";
  starts_at?: string | null;
  ends_at?: string | null;
  is_active?: boolean | null;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://tradescard-api.vercel.app";

export default function OffersPage() {
  const supabase = useMemo(
    () =>
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const [me, setMe] = useState<Me | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    let aborted = false;

    async function run() {
      setLoading(true);
      setErr("");

      try {
        // session (anonymous is fine)
        const { data } = await supabase.auth.getSession();
        const user = data?.session?.user ?? null;

        // account snapshot (if logged in)
        let tier: Me["tier"] = "access";
        let status = "free";
        let user_id = "";

        if (user) {
          const acc = await fetch(
            `${API_BASE}/api/account?user_id=${encodeURIComponent(user.id)}`,
            { cache: "no-store" }
          );
          if (acc.ok) {
            const a = await acc.json();
            user_id = a?.user_id ?? user.id;
            tier = (a?.members?.tier as Me["tier"]) ?? "access";
            status = a?.members?.status ?? "free";
            if (!aborted) setMe({ user_id, email: a?.email, tier, status });
          }
        } else {
          setMe(null);
        }

        // decide what to show:
        // - access or not active: show public/access catalogue
        // - paid + active: show full catalogue
        // If your API supports a query param, use it. Otherwise, request once and filter client-side.
        const qs =
          tier === "access" || status !== "active" ? "" : "?scope=full";
        const res = await fetch(`${API_BASE}/api/offers${qs}`, {
          cache: "no-store",
        });

        if (!res.ok) throw new Error(`offers ${res.status}`);
        const list: Offer[] = await res.json();

        const filtered =
          tier === "access" || status !== "active"
            ? list.filter(
                (o) =>
                  (o.visibility ?? "public") === "public" ||
                  (o.visibility ?? "public") === "access"
              )
            : list; // full for paid

        if (!aborted) setOffers(filtered);
      } catch (e: unknown) {
        if (!aborted)
          setErr(e instanceof Error ? e.message : "Something went wrong");
      } finally {
        if (!aborted) setLoading(false);
      }
    }

    run();
    return () => {
      aborted = true;
    };
  }, [supabase]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold">Offers</h1>
        <p className="text-neutral-400">
          Curated savings for the trade. {me && me.tier !== "access" && me.status === "active"
            ? "Full catalogue unlocked."
            : "Join to unlock the full catalogue."}
        </p>
      </header>

      {err && (
        <div className="mb-4 rounded border border-red-600/40 bg-red-900/10 p-3 text-red-300">
          {err}
        </div>
      )}

      {loading && (
        <div className="grid gap-3 md:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-28 rounded-xl border border-neutral-800 bg-neutral-900 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && !err && (
        <>
          {offers.length === 0 ? (
            <div className="text-neutral-400">No offers available yet. Check back soon.</div>
          ) : (
            <div className="grid gap-3 md:grid-cols-3">
              {offers.map((o) => (
                <a
                  key={o.id}
                  href={o.link || "#"}
                  className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 hover:bg-neutral-800"
                  target={o.link?.startsWith("http") ? "_blank" : undefined}
                  rel={o.link?.startsWith("http") ? "noopener noreferrer" : undefined}
                >
                  <div className="text-xs text-neutral-400 flex items-center justify-between">
                    <span>{o.partner || "Partner"}</span>
                    <span className="rounded bg-neutral-800 px-1.5 py-0.5">
                      {o.category}
                    </span>
                  </div>
                  <div className="font-medium mt-1">{o.title}</div>
                  {o.code && (
                    <div className="mt-1 text-xs">
                      Code: <span className="font-mono">{o.code}</span>
                    </div>
                  )}
                </a>
              ))}
            </div>
          )}

          {(!me || me.tier === "access" || me.status !== "active") && (
            <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
              <div className="font-medium mb-1">Want more?</div>
              <p className="text-neutral-300">
                Upgrade to <span className="font-medium">Member</span> or{" "}
                <span className="font-medium">Pro</span> for the full catalogue.
              </p>
              <a
                href="/join"
                className="mt-3 inline-block rounded bg-amber-400 text-black font-medium px-4 py-2"
              >
                See membership options
              </a>
            </div>
          )}
        </>
      )}
    </main>
  );
}