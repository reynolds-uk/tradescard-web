// app/rewards/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import PrimaryButton from "@/components/PrimaryButton";
import { useMe } from "@/lib/useMe";
import { routeToJoin } from "@/lib/routeToJoin";
import { shouldShowTrial, TRIAL_COPY } from "@/lib/trial";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://tradescard-api.vercel.app";

type Tier = "access" | "member" | "pro";

type RewardsResp = {
  lifetime_points: number;
  points_this_month: number;
};

const TIER_BOOST: Record<Tier, number> = {
  access: 1.0,
  member: 1.25,
  pro: 1.5,
};

function endOfThisMonthLocal() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
      <div className="text-sm text-neutral-400">{label}</div>
      <div className="mt-2 text-3xl font-semibold">{value}</div>
      {hint ? <div className="mt-1 text-xs text-neutral-500">{hint}</div> : null}
    </div>
  );
}

export default function RewardsPage() {
  const me = useMe(); // { user?, email?, tier, status, ready }
  const isSignedIn = !!me?.user;
  const tier = (me?.tier as Tier) ?? "access";
  const status = me?.status ?? "free";
  const isPaidActive =
    (status === "active" || status === "trialing") &&
    (tier === "member" || tier === "pro");
  const showExplainer = !isPaidActive;
  const showTrial = shouldShowTrial(me);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");

  const [pointsThisMonth, setPointsThisMonth] = useState(0);
  const [lifetimePoints, setLifetimePoints] = useState(0);

  const drawCutoff = endOfThisMonthLocal().toLocaleString();

  // Load rewards summary for signed-in users; stats are meaningful for paid tiers
  useEffect(() => {
    let aborted = false;

    async function load() {
      setErr("");
      setLoading(true);
      try {
        if (!me?.user?.id) {
          if (!aborted) {
            setPointsThisMonth(0);
            setLifetimePoints(0);
          }
          return;
        }

        const rewRes = await fetch(
          `${API_BASE}/api/rewards/summary?user_id=${encodeURIComponent(
            me.user.id
          )}`,
          { cache: "no-store" }
        );
        if (!rewRes.ok) throw new Error(`Rewards failed (${rewRes.status})`);
        const rew: RewardsResp = await rewRes.json();

        if (!aborted) {
          setPointsThisMonth(
            Number.isFinite(rew.points_this_month) ? rew.points_this_month : 0
          );
          setLifetimePoints(
            Number.isFinite(rew.lifetime_points) ? rew.lifetime_points : 0
          );
        }
      } catch (e) {
        if (!aborted) {
          setErr(e instanceof Error ? e.message : "Something went wrong");
        }
      } finally {
        if (!aborted) setLoading(false);
      }
    }

    // Clean redirect params (optional)
    try {
      const url = new URL(window.location.href);
      if (
        url.searchParams.has("status") ||
        url.searchParams.has("success") ||
        url.searchParams.has("canceled") ||
        url.searchParams.has("auth_error")
      ) {
        window.history.replaceState({}, "", url.pathname);
      }
    } catch {
      /* ignore */
    }

    void load();
    return () => {
      aborted = true;
    };
  }, [me?.user?.id]);

  const entriesThisMonth = useMemo(() => {
    if (loading) return "—";
    return Math.max(0, Math.floor(pointsThisMonth * TIER_BOOST[tier]));
  }, [loading, pointsThisMonth, tier]);

  return (
    <Container>
      <PageHeader
        title="Rewards"
        subtitle={
          showExplainer
            ? "Points become entries for weekly and monthly draws. Join free to get started — upgrade any time for boosted entries."
            : "Earn points every month you’re a paid member. Your tier boosts points; points become entries for weekly and monthly draws."
        }
        aside={
          showExplainer ? (
            <div className="flex items-center gap-2">
              {!isSignedIn && (
                <button
                  onClick={() => routeToJoin()}
                  className="rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm hover:bg-neutral-800"
                >
                  Join free
                </button>
              )}
              <PrimaryButton onClick={() => routeToJoin("member")}>
                {showTrial ? TRIAL_COPY : isSignedIn ? "Upgrade" : "Become a Member"}
              </PrimaryButton>
            </div>
          ) : (
            <button
              onClick={() => window.location.reload()}
              disabled={loading}
              className="rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm hover:bg-neutral-800 disabled:opacity-60"
            >
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          )
        }
      />

      {err && (
        <div className="mb-4 rounded border border-red-600/40 bg-red-900/10 px-3 py-2 text-red-300">
          {err}
        </div>
      )}

      {/* Explainer for Access/logged-out */}
      {showExplainer && (
        <>
          <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
            <div className="font-medium mb-1">How entries work</div>
            <ul className="list-disc list-inside text-neutral-300 space-y-1 text-sm">
              <li>Join free to browse and redeem offers.</li>
              <li>Become a Member or Pro to start earning points each month.</li>
              <li>Your tier boosts points: Member 1.25×, Pro 1.5×.</li>
              <li>
                Points convert to entries for weekly spot prizes and a monthly draw.
              </li>
              <li>
                No purchase necessary — free postal entry route available on public
                promo pages.
              </li>
            </ul>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {!isSignedIn && (
              <button
                onClick={() => routeToJoin()}
                className="rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm hover:bg-neutral-800 text-left"
              >
                <div className="font-semibold">Join free</div>
                <div className="text-neutral-400">Start with Access. Upgrade any time.</div>
              </button>
            )}
            <button
              onClick={() => routeToJoin("member")}
              className="rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm hover:bg-neutral-800 text-left"
            >
              <div className="font-semibold">Member · £2.99/mo</div>
              <div className="text-neutral-400">1.25× points boost + benefits.</div>
            </button>
            <button
              onClick={() => routeToJoin("pro")}
              className="rounded-lg border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm hover:bg-amber-400/20 text-left ring-1 ring-amber-400/30"
            >
              <div className="font-semibold">Pro · £7.99/mo</div>
              <div className="text-neutral-200">1.5× points boost + early deals.</div>
            </button>
          </div>

          <div className="mt-6 text-[12px] text-neutral-500">
            Entries close <span className="font-semibold">{drawCutoff}</span>. Paid and
            free routes are treated equally.
          </div>
        </>
      )}

      {/* Paid, active members see their stats */}
      {!showExplainer && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard
              label="Points this month (base)"
              value={loading ? "—" : pointsThisMonth}
              hint="Base points earned this billing month"
            />
            <StatCard
              label="Tier boost"
              value={loading ? "—" : `${TIER_BOOST[tier].toFixed(2)}×`}
              hint={`Your tier: ${tier.toUpperCase()}`}
            />
            <StatCard
              label="Entries this month"
              value={entriesThisMonth}
              hint="Used for monthly prize draw"
            />
          </div>

          <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
            <div className="text-sm text-neutral-400">Lifetime points</div>
            <div className="mt-2 text-2xl font-semibold">
              {loading ? "—" : lifetimePoints}
            </div>
            <div className="mt-1 text-xs text-neutral-500">
              Lifetime points build towards milestones and special giveaways.
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
            <div className="font-medium mb-1">Next draw</div>
            <div className="text-sm text-neutral-300">
              Entries close <span className="font-semibold">{drawCutoff}</span>. Winners
              are selected at random from all eligible entries (paid and free routes
              treated equally).
            </div>
          </div>
        </>
      )}

      {/* Referrals placeholder (always visible) */}
      <div className="mt-6 rounded-xl border border-dashed border-neutral-800 p-4">
        <div className="font-medium mb-1">Referrals (coming soon)</div>
        <p className="text-sm text-neutral-400">
          Invite a mate, earn bonus points once they become a paid member (after a
          short verification window). We’ll show your invite link and referral-earned
          points here.
        </p>
      </div>
    </Container>
  );
}