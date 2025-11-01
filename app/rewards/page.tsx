// app/rewards/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

type Summary = {
  month?: number;        // points this month before/after boost (your API)
  lifetime?: number;
  total_points?: number; // fallback
  tier?: "access" | "member" | "pro" | string;
  boost?: number;        // optional: set this in API, else we compute client-side
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://tradescard-api.vercel.app";

const TIER_BOOST: Record<string, number> = {
  access: 1.0,
  member: 1.25,
  pro: 1.5,
};

export default function RewardsPage() {
  const supabase = useMemo(
    () => createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ),
    []
  );

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");
  const [data, setData] = useState<Summary | null>(null);
  const [isMember, setIsMember] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr("");

        const { data: session } = await supabase.auth.getSession();
        const user = session?.session?.user;

        if (!user) {
          setErr("Please sign in to see your rewards.");
          setLoading(false);
          return;
        }

        const res = await fetch(
          `${API_BASE}/api/rewards/summary?user_id=${encodeURIComponent(user.id)}`,
          { cache: "no-store" }
        );

        if (res.status === 403) {
          // back end enforces paid-only
          setIsMember(false);
          setLoading(false);
          return;
        }

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "Failed to load rewards.");
        }

        const json: Summary = await res.json();
        // if API doesn’t provide boost, compute from tier
        const tier = (json.tier || "access").toLowerCase();
        const boost = json.boost ?? TIER_BOOST[tier] ?? 1.0;

        setData({
          ...json,
          tier,
          boost,
        });
        // treat anything beyond access as “member”
        setIsMember(tier !== "access");
      } catch (e: any) {
        setErr(e.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    })();
  }, [supabase]);

  const pointsThisMonth = data?.month ?? data?.total_points ?? 0;
  const displayBoost = data?.boost ?? 1.0;
  const entriesThisMonth = Math.floor(pointsThisMonth * displayBoost);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Rewards</h1>
        <p className="text-sm text-neutral-400">
          Earn points every month you’re a member. Higher tiers boost your points. Points win prizes — we run weekly and monthly draws.
        </p>
      </header>

      {loading && <p className="text-neutral-400">Loading…</p>}
      {err && !loading && <p className="text-red-400">Error: {err}</p>}

      {!loading && !err && !isMember && (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="text-neutral-300 mb-2">Rewards are for paid members.</p>
          <p className="text-sm text-neutral-400">
            Upgrade to <strong>Member</strong> (1.25× points) or <strong>Pro</strong> (1.5× points) to start collecting entries for weekly spot prizes and the monthly draw.
          </p>
          <div className="mt-4 flex gap-2">
            <a
              className="px-4 py-2 rounded-lg bg-amber-400 text-black font-medium"
              href="/account"
            >
              Upgrade now
            </a>
            <a
              className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700"
              href="/"
            >
              See offers
            </a>
          </div>
        </div>
      )}

      {!loading && !err && isMember && (
        <>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
              <p className="text-neutral-300">Points this month (base)</p>
              <p className="text-4xl font-semibold mt-2">{pointsThisMonth}</p>
            </div>

            <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
              <p className="text-neutral-300">Tier boost</p>
              <div className="mt-2 flex items-center gap-2">
                <p className="text-4xl font-semibold">{displayBoost.toFixed(2)}×</p>
                <span className="rounded bg-neutral-800 px-2 py-1 text-xs uppercase">
                  {data?.tier || "access"}
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-1">
                Upgrade for more entries
              </p>
            </div>

            <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
              <p className="text-neutral-300">Entries this month</p>
              <p className="text-4xl font-semibold mt-2">{entriesThisMonth}</p>
              <p className="text-xs text-neutral-500 mt-1">
                Used for monthly prize draw
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
            <p className="text-neutral-300">Lifetime points</p>
            <p className="text-4xl font-semibold mt-2">{data?.lifetime ?? 0}</p>
            <p className="text-xs text-neutral-500 mt-1">
              Lifetime points help with long-term milestones and special giveaways.
            </p>
          </div>

          <div className="rounded-xl border border-neutral-800 p-6">
            <h2 className="font-medium mb-2">How it works</h2>
            <ul className="list-disc list-inside text-neutral-300 space-y-1">
              <li>Earn points every billing month you’re an active member.</li>
              <li>Your tier applies a boost: Access 1×, Member 1.25×, Pro 1.5×.</li>
              <li>Points = entries. We run weekly spot prizes and a monthly draw.</li>
            </ul>
            <div className="mt-4 flex gap-2">
              <a className="px-4 py-2 rounded-lg bg-amber-400 text-black font-medium" href="/account">
                Upgrade to boost entries
              </a>
              <a className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700" href="/">
                See offers
              </a>
            </div>
          </div>
        </>
      )}

      {!loading && !err && !data && !isMember && (
        <p className="text-xs text-neutral-500">Viewing demo state. Sign in & upgrade to see real points.</p>
      )}
    </div>
  );
}