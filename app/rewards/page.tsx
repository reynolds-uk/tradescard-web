// app/rewards/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://tradescard-api.vercel.app";

type AccountRes = {
  user_id: string;
  email: string;
  members: null | {
    status: "active" | "trialing" | "past_due" | "canceled" | "free" | string;
    tier: "access" | "member" | "pro" | string;
    current_period_end: string | null;
  };
};

type RewardsSummary = {
  lifetime_points: number;
  points_this_month: number;
  // Optional extras we may add later:
  // referral_points?: number;
  // activity?: Array<{ id:string; source:string; points:number; at:string }>;
};

const TIER_BOOST: Record<"access" | "member" | "pro", number> = {
  access: 1.0,
  member: 1.25,
  pro: 1.5,
};

export default function RewardsPage() {
  const supabase = useMemo(
    () =>
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [tier, setTier] = useState<"access" | "member" | "pro">("access");
  const [status, setStatus] = useState<string>("free");

  const [lifetimePoints, setLifetimePoints] = useState(0);
  const [monthPoints, setMonthPoints] = useState(0);

  const boost = TIER_BOOST[tier] ?? 1.0;
  const entriesThisMonth = Math.floor(monthPoints * boost);

  async function fetchRewards() {
    setError("");
    setLoading(true);
    try {
      // 1) Who’s signed in?
      const { data } = await supabase.auth.getSession();
      const user = data?.session?.user ?? null;
      if (!user) {
        // Not signed in -> keep zeroed UI but explain why
        setError("Please sign in to see your rewards.");
        setLoading(false);
        return;
      }

      const uid = user.id;

      // 2) Membership (for tier + status)
      const accRes = await fetch(`${API_BASE}/api/account?user_id=${encodeURIComponent(uid)}`, {
        cache: "no-store",
      });
      if (accRes.ok) {
        const acc: AccountRes = await accRes.json();
        const t = (acc?.members?.tier || "access") as "access" | "member" | "pro";
        setTier(t);
        setStatus(acc?.members?.status || "free");
      }

      // 3) Rewards summary
      let r: Response = await fetch(
        `${API_BASE}/api/rewards/summary?user_id=${encodeURIComponent(uid)}`,
        { cache: "no-store" }
      );

      // Fall back to /api/rewards if /summary isn’t there
      if (!r.ok) {
        r = await fetch(`${API_BASE}/api/rewards?user_id=${encodeURIComponent(uid)}`, {
          cache: "no-store",
        });
      }

      if (!r.ok) {
        throw new Error(`Rewards fetch failed (${r.status})`);
      }

      const summary: RewardsSummary = await r.json();
      setLifetimePoints(Math.max(0, Number(summary?.lifetime_points || 0)));
      setMonthPoints(Math.max(0, Number(summary?.points_this_month || 0)));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRewards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold">Rewards</h1>
        <p className="text-sm text-neutral-400">
          Earn points every month you’re a member. Higher tiers boost your points. Points win prizes — we run weekly and monthly draws.
        </p>
      </div>

      <div className="mb-4 flex items-center gap-2">
        <button
          onClick={fetchRewards}
          disabled={loading}
          className="rounded bg-neutral-800 px-3 py-1 text-sm hover:bg-neutral-700 disabled:opacity-60"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
        {!!error && (
          <span className="text-sm text-red-300">
            {error}
          </span>
        )}
      </div>

      {/* Summary tiles */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <div className="text-sm text-neutral-400">Points this month (base)</div>
          <div className="mt-1 text-3xl font-semibold">{loading ? "—" : monthPoints}</div>
          <div className="mt-2 text-xs text-neutral-500">
            Base points earned this billing month.
          </div>
        </div>

        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <div className="text-sm text-neutral-400">Tier boost</div>
          <div className="mt-1 flex items-center gap-2">
            <div className="text-3xl font-semibold">{boost.toFixed(2)}×</div>
            <span className="rounded bg-neutral-800 px-2 py-0.5 text-xs">
              {tier.toUpperCase()}
            </span>
          </div>
          <div className="mt-2 text-xs text-neutral-500">
            Upgrade for more entries.
          </div>
        </div>

        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <div className="text-sm text-neutral-400">Entries this month</div>
          <div className="mt-1 text-3xl font-semibold">
            {loading ? "—" : entriesThisMonth}
          </div>
          <div className="mt-2 text-xs text-neutral-500">
            Used for monthly prize draw.
          </div>
        </div>
      </div>

      {/* Lifetime */}
      <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
        <div className="text-sm text-neutral-400">Lifetime points</div>
        <div className="mt-1 text-2xl font-semibold">{loading ? "—" : lifetimePoints}</div>
        <div className="mt-2 text-xs text-neutral-500">
          Lifetime points help with long-term milestones and special giveaways.
        </div>
      </div>

      {/* Referral stub (next step) */}
      <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-neutral-400">Referrals</div>
            <div className="mt-1 font-medium">Invite mates. Earn bonus points.</div>
            <p className="mt-1 text-sm text-neutral-400">
              “Invite 3 mates, get 1 month free” — we’ll also add bonus points per referral.
            </p>
          </div>
          <a
            href="/account"
            className="rounded bg-amber-400 px-3 py-1.5 text-sm font-medium text-black hover:opacity-90"
          >
            Get your invite link
          </a>
        </div>
      </div>

      {/* How it works */}
      <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
        <div className="font-medium mb-2">How it works</div>
        <ul className="list-disc list-inside space-y-1 text-neutral-300 text-sm">
          <li>Earn points every billing month you’re an active paid member.</li>
          <li>Your tier boosts points: Access 1.0×, Member 1.25×, Pro 1.5×.</li>
          <li>Points = entries. We run weekly spot prizes and a monthly draw.</li>
        </ul>
      </div>
    </main>
  );
}