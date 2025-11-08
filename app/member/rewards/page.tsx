// app/member/rewards/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import { useMe } from "@/lib/useMe";
import { useMeReady } from "@/lib/useMeReady";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://tradescard-api.vercel.app";

type Tier = "access" | "member" | "pro";

type RewardsSummary = {
  lifetime_points: number;
  points_this_month: number;
};

export default function MemberRewardsPage() {
  const me = useMe();                  // { user?, tier?, status? }
  const ready = useMeReady();          // avoid auth flash

  const tier: Tier = (me?.tier as Tier) ?? "access";
  const isPaid =
    (tier === "member" || tier === "pro") &&
    (me?.status === "active" || me?.status === "trialing");

  const uid = useMemo(() => me?.user?.id ?? null, [me?.user?.id]);

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<RewardsSummary | null>(null);
  const [error, setError] = useState<string>("");

  // Fetch rewards once we *know* there is a user
  useEffect(() => {
    if (!ready) return;
    if (!uid) {
      // Not signed in; nothing to fetch
      setSummary(null);
      setLoading(false);
      return;
    }

    let aborted = false;

    (async () => {
      try {
        setLoading(true);
        setError("");

        const url = `${API_BASE}/api/rewards/summary?user_id=${encodeURIComponent(
          uid
        )}`;

        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`rewards/summary ${res.status}`);

        const data: RewardsSummary = await res.json();
        if (!aborted) {
          setSummary({
            lifetime_points: Number.isFinite(data.lifetime_points)
              ? data.lifetime_points
              : 0,
            points_this_month: Number.isFinite(data.points_this_month)
              ? data.points_this_month
              : 0,
          });
        }
      } catch (e) {
        if (!aborted) setError(e instanceof Error ? e.message : "Failed to load rewards");
      } finally {
        if (!aborted) setLoading(false);
      }
    })();

    return () => {
      aborted = true;
    };
  }, [ready, uid]);

  const subtitle = useMemo(() => {
    if (!ready) return "Loading…";
    if (!uid) return "Sign in to see your rewards.";
    if (!isPaid) return "Become a paid member to earn points and monthly draw entries.";
    return "Earn points every month you’re a paid member. Points convert to draw entries.";
  }, [ready, uid, isPaid]);

  // Basic tier boost copy
  const tierBoost = tier === "pro" ? "1.5×" : "1.25×";

  return (
    <Container>
      <PageHeader title="Rewards" subtitle={subtitle} />

      {/* Errors */}
      {error && (
        <div className="mb-4 rounded border border-red-600/40 bg-red-900/10 px-3 py-2 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Skeleton */}
      {(!ready || loading) && (
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-2xl border border-neutral-800 bg-neutral-900/60 animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Content (only when ready & not loading) */}
      {ready && !loading && (
        <>
          {uid && isPaid ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
                <div className="text-xs text-neutral-400 mb-1">Points this month (base)</div>
                <div className="text-2xl font-semibold">
                  {summary ? summary.points_this_month : "—"}
                </div>
              </div>

              <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
                <div className="text-xs text-neutral-400 mb-1">Tier boost</div>
                <div className="text-2xl font-semibold">{tierBoost}</div>
              </div>

              <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
                <div className="text-xs text-neutral-400 mb-1">Lifetime points</div>
                <div className="text-2xl font-semibold">
                  {summary ? summary.lifetime_points : "—"}
                </div>
              </div>
            </div>
          ) : (
            // Fallback if signed out or not paid (this page should usually be reached from paid area)
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 text-sm text-neutral-300">
              This area shows your member rewards once you’re signed in with an active
              membership.
            </div>
          )}
        </>
      )}
    </Container>
  );
}