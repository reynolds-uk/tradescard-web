// app/rewards/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import PrimaryButton from "@/components/PrimaryButton";
import { useMe } from "@/lib/useMe";
import { useMeReady } from "@/lib/useMeReady";
import { routeToJoin } from "@/lib/routeToJoin";
import { shouldShowTrial, TRIAL_COPY } from "@/lib/trial";
import PromoRewards from "@/components/promo/PromoRewards";

type Tier = "access" | "member" | "pro";

type RewardSummary = {
  month_points?: number | null;
  lifetime_points?: number | null;
  entries_month?: number | null;
  tier_multiplier?: number | null; // e.g. 1.25, 1.5
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://tradescard-api.vercel.app";

/* small UI atoms */
function StatCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
      <div className="text-sm text-neutral-400">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
      {helper && <div className="mt-1 text-xs text-neutral-500">{helper}</div>}
    </div>
  );
}

export default function RewardsPage() {
  const me = useMe();                 // { user?, tier?, status? }
  const ready = useMeReady();         // avoid flicker until auth settled
  const tier: Tier = (me?.tier as Tier) ?? "access";
  const isPaid = (tier === "member" || tier === "pro") &&
                 (me?.status === "active" || me?.status === "trialing");

  const showTrial = shouldShowTrial(me);

  const [summary, setSummary] = useState<RewardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");

  // fetch member rewards once we know auth state and only for paid users
  useEffect(() => {
    if (!ready) return;
    if (!isPaid) {
      setSummary(null);
      setLoading(false);
      return;
    }

    let aborted = false;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const res = await fetch(`${API_BASE}/api/rewards/summary`, { cache: "no-store" });
        if (!res.ok) throw new Error(`rewards ${res.status}`);
        const data: RewardSummary = await res.json();
        if (!aborted) setSummary(data);
      } catch (e) {
        if (!aborted) setErr(e instanceof Error ? e.message : "Failed to load rewards.");
      } finally {
        if (!aborted) setLoading(false);
      }
    })();

    return () => {
      aborted = true;
    };
  }, [ready, isPaid]);

  const subtitle = useMemo(() => {
    if (!ready) return "Loading your rewards…";
    if (!isPaid) return ""; // promo component provides its own copy
    return "Earn points every month you’re a paid member. Your tier boosts points; points become entries for weekly and monthly draws.";
  }, [ready, isPaid]);

  // non-paid = show promo
  if (ready && !isPaid) {
    return <PromoRewards onJoin={() => routeToJoin("member")} trialCopy={showTrial ? TRIAL_COPY : undefined} />;
  }

  return (
    <Container>
      <PageHeader
        title="Rewards"
        subtitle={subtitle}
        aside={
          ready && isPaid && tier === "member" ? (
            <PrimaryButton onClick={() => routeToJoin("pro")}>
              Upgrade to Pro
            </PrimaryButton>
          ) : ready && isPaid && tier === "pro" ? (
            <span className="rounded border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-xs text-amber-200">
              Pro boost active
            </span>
          ) : undefined
        }
      />

      {err && (
        <div className="mb-4 rounded border border-red-600/40 bg-red-900/10 p-3 text-red-300">
          {err}
        </div>
      )}

      {/* skeleton */}
      {(loading || !ready) && (
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl border border-neutral-800 bg-neutral-900 animate-pulse" />
          ))}
        </div>
      )}

      {ready && !loading && isPaid && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard
              label="Points this month (base)"
              value={
                summary?.month_points != null
                  ? `${summary.month_points}`
                  : "—"
              }
            />
            <StatCard
              label="Tier boost"
              value={
                summary?.tier_multiplier
                  ? `${summary.tier_multiplier.toFixed(2)}×`
                  : tier === "pro"
                  ? "1.50×"
                  : "1.25×"
              }
              helper={tier === "pro" ? "Pro members earn 1.5×" : "Member earns 1.25×"}
            />
            <StatCard
              label="Entries this month"
              value={
                summary?.entries_month != null
                  ? `${summary.entries_month}`
                  : "—"
              }
              helper="Weekly spot prizes + monthly draw"
            />
          </div>

          {/* Upsell strip for Member only */}
          {tier === "member" && (
            <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 flex items-center justify-between gap-3">
              <div className="text-sm text-neutral-300">
                Go Pro for a bigger boost and early-access deals.
              </div>
              <PrimaryButton onClick={() => routeToJoin("pro")}>
                Upgrade to Pro
              </PrimaryButton>
            </div>
          )}
        </>
      )}
    </Container>
  );
}