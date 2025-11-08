// app/member/rewards/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import PrimaryButton from "@/components/PrimaryButton";
import { useMe } from "@/lib/useMe";
import { useMeReady } from "@/lib/useMeReady";
import { routeToJoin } from "@/lib/routeToJoin";

type Tier = "access" | "member" | "pro";

type RewardsSummary = {
  lifetime_points: number;
  points_this_month: number; // base points before tier boost
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://tradescard-api.vercel.app";

// Numeric boost used to convert points ➜ entries
const TIER_BOOST: Record<Tier, number> = {
  access: 1.0,
  member: 1.25,
  pro: 1.5,
};

export default function MemberRewardsPage() {
  const me = useMe();                   // { user?, email?, tier, status }
  const ready = useMeReady();

  const tier: Tier = (me?.tier as Tier) ?? "access";
  const isPaid =
    (tier === "member" || tier === "pro") &&
    (me?.status === "active" || me?.status === "trialing");

  // If someone hits this route without a paid plan (stale cookie / deep link), bounce to promo.
  useEffect(() => {
    if (ready && !isPaid) window.location.replace("/rewards");
  }, [ready, isPaid]);

  const subtitle = useMemo(() => {
    if (!ready) return "Loading…";
    return "Earn points every month you’re a paid member. Points become draw entries.";
  }, [ready]);

  // -----------------------------
  // Fetch rewards summary
  // -----------------------------
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");
  const [summary, setSummary] = useState<RewardsSummary | null>(null);

  useEffect(() => {
    if (!ready || !isPaid || !me?.user?.id) return;

    let aborted = false;
    (async () => {
      try {
        setLoading(true);
        setErr("");

        const url = `${API_BASE}/api/rewards/summary?user_id=${encodeURIComponent(
          me.user.id
        )}`;

        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`rewards/summary ${res.status}`);

        const json = (await res.json()) as RewardsSummary;
        if (!aborted) {
          setSummary({
            lifetime_points: Number.isFinite(json?.lifetime_points)
              ? json.lifetime_points
              : 0,
            points_this_month: Number.isFinite(json?.points_this_month)
              ? json.points_this_month
              : 0,
          });
        }
      } catch (e) {
        if (!aborted) setErr(e instanceof Error ? e.message : "Couldn’t load rewards.");
      } finally {
        if (!aborted) setLoading(false);
      }
    })();

    return () => {
      aborted = true;
    };
  }, [ready, isPaid, me?.user?.id]);

  const boost = TIER_BOOST[tier] ?? 1.0;
  const entriesThisMonth =
    summary ? Math.floor(summary.points_this_month * boost) : null;

  return (
    <Container>
      <PageHeader title="Rewards" subtitle={subtitle} />

      {err && (
        <div className="mb-4 rounded border border-red-600/40 bg-red-900/10 p-3 text-red-300 text-sm">
          {err}
        </div>
      )}

      {/* Top stat cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <div className="text-sm text-neutral-400">Points this month (base)</div>
          <div className="mt-1 text-2xl font-semibold">
            {loading ? "—" : summary ? summary.points_this_month : "—"}
          </div>
        </div>

        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <div className="text-sm text-neutral-400">Tier boost</div>
          <div className="mt-1 text-2xl font-semibold">
            {tier === "pro" ? "1.50×" : tier === "member" ? "1.25×" : "1.00×"}
          </div>
        </div>

        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <div className="text-sm text-neutral-400">Entries this month</div>
          <div className="mt-1 text-2xl font-semibold">
            {loading ? "—" : entriesThisMonth ?? "—"}
          </div>
        </div>
      </div>

      {/* Lifetime + explainer */}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <div className="text-sm text-neutral-400">Lifetime points</div>
          <div className="mt-1 text-2xl font-semibold">
            {loading ? "—" : summary ? summary.lifetime_points : "—"}
          </div>
          <p className="mt-2 text-sm text-neutral-400">
            Lifetime points remain on your profile but only qualify for draws while your membership
            is active.
          </p>
        </div>

        {tier === "member" && (
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 flex items-center justify-between">
            <div className="text-sm text-neutral-300">
              Go <span className="font-medium">Pro</span> for a bigger monthly boost and early-access deals.
            </div>
            <PrimaryButton onClick={() => routeToJoin("pro")}>Upgrade to Pro</PrimaryButton>
          </div>
        )}
      </div>
    </Container>
  );
}