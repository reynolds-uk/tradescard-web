// app/rewards/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import { useJoinModal } from "@/components/JoinModalContext";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://tradescard-api.vercel.app";

type RewardsResp = {
  lifetime_points: number;
  points_this_month: number;
};

type Tier = "access" | "member" | "pro";

type AccountResp = {
  user_id: string;
  email: string;
  full_name?: string | null;
  members: null | {
    status: "active" | "trialing" | "past_due" | "canceled" | "free" | string;
    tier: Tier | string;
    current_period_end: string | null;
  };
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

function StatCard(props: { label: string; value: string | number; hint?: string }) {
  const { label, value, hint } = props;
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
      <div className="text-sm text-neutral-400">{label}</div>
      <div className="mt-2 text-3xl font-semibold">{value}</div>
      {hint ? <div className="mt-1 text-xs text-neutral-500">{hint}</div> : null}
    </div>
  );
}

export default function RewardsPage() {
  const { openJoin } = useJoinModal();

  // Supabase client (browser only)
  const supabase = useMemo(() => {
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }, []);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [tier, setTier] = useState<Tier>("access");
  const [acctStatus, setAcctStatus] = useState<string>("free");

  const [pointsThisMonth, setPointsThisMonth] = useState(0);
  const [lifetimePoints, setLifetimePoints] = useState(0);

  const boost = TIER_BOOST[tier];
  const entriesThisMonth = Math.max(0, Math.floor(pointsThisMonth * boost));
  const drawCutoff = endOfThisMonthLocal().toLocaleString();

  async function loadAll() {
    setErr("");
    setLoading(true);
    try {
      const { data } = await supabase.auth.getSession();
      const user = data?.session?.user ?? null;

      if (!user) {
        // Logged out: show explainer only
        setUserEmail(null);
        setTier("access");
        setAcctStatus("free");
        setPointsThisMonth(0);
        setLifetimePoints(0);
        return;
      }

      setUserEmail(user.email ?? null);

      // 1) Account
      const accRes = await fetch(
        `${API_BASE}/api/account?user_id=${encodeURIComponent(user.id)}`,
        { cache: "no-store" }
      );
      if (!accRes.ok) throw new Error(`Account failed (${accRes.status})`);
      const acc: AccountResp = await accRes.json();

      const rawTier = (acc.members?.tier as Tier) ?? "access";
      const safeTier: Tier = rawTier === "member" || rawTier === "pro" ? rawTier : "access";
      setTier(safeTier);
      setAcctStatus(acc.members?.status ?? "free");

      // 2) Rewards summary (only meaningful when signed in)
      const rewRes = await fetch(
        `${API_BASE}/api/rewards/summary?user_id=${encodeURIComponent(user.id)}`,
        { cache: "no-store" }
      );
      if (!rewRes.ok) throw new Error(`Rewards failed (${rewRes.status})`);
      const rew: RewardsResp = await rewRes.json();

      setPointsThisMonth(Number.isFinite(rew.points_this_month) ? rew.points_this_month : 0);
      setLifetimePoints(Number.isFinite(rew.lifetime_points) ? rew.lifetime_points : 0);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Clean noisy query params after Stripe/auth redirects
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
      /* no-op */
    }
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isSignedIn = !!userEmail;
  const isActive = acctStatus === "active" || acctStatus === "trialing";
  const showUpgrade = !isActive || tier === "access";

  return (
    <Container>
      <PageHeader
        title="Rewards"
        subtitle={
          isSignedIn
            ? "Earn points every month you’re a paid member. Your tier boosts points — points become entries for weekly and monthly draws."
            : "Points turn into entries for weekly and monthly draws. Join free to get started; upgrade any time for boosted entries."
        }
        aside={
          !isSignedIn ? (
            <button
              onClick={() => openJoin("member")}
              className="rounded bg-neutral-800 hover:bg-neutral-700 px-3 py-2"
            >
              Sign in / Join
            </button>
          ) : (
            <button
              onClick={() => void loadAll()}
              disabled={loading}
              className="rounded bg-neutral-800 hover:bg-neutral-700 px-3 py-2 disabled:opacity-60"
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

      {/* Logged OUT — simple explainer + CTAs */}
      {!isSignedIn && (
        <>
          <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
            <div className="font-medium mb-1">How entries work</div>
            <ul className="list-disc list-inside text-neutral-300 space-y-1 text-sm">
              <li>Join free to browse and redeem offers.</li>
              <li>Become a Member or Pro to start earning points each month.</li>
              <li>Your tier boosts points: Member 1.25×, Pro 1.5×.</li>
              <li>Points convert to entries for weekly spot prizes and a monthly draw.</li>
              <li>No purchase necessary — free postal entry route available on public promo pages.</li>
            </ul>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <button
              onClick={() => openJoin("access")}
              className="rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm hover:bg-neutral-800 text-left"
            >
              <div className="font-semibold">Join free</div>
              <div className="text-neutral-400">Start with Access. Upgrade any time.</div>
            </button>
            <button
              onClick={() => openJoin("member")}
              className="rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm hover:bg-neutral-800 text-left"
            >
              <div className="font-semibold">Member · £2.99/mo</div>
              <div className="text-neutral-400">1.25× points boost + benefits.</div>
            </button>
            <button
              onClick={() => openJoin("pro")}
              className="rounded-lg border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm hover:bg-amber-400/20 text-left ring-1 ring-amber-400/30"
            >
              <div className="font-semibold">Pro · £7.99/mo</div>
              <div className="text-neutral-200">1.5× points boost + early deals.</div>
            </button>
          </div>

          <div className="mt-6 text-[12px] text-neutral-500">
            Entries close <span className="font-semibold">{drawCutoff}</span>. Paid and free routes
            are treated equally.
          </div>
        </>
      )}

      {/* Logged IN — show stats, draw meta, upgrade hint */}
      {isSignedIn && (
        <>
          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard
              label="Points this month (base)"
              value={loading ? "—" : pointsThisMonth}
              hint="Base points earned this billing month"
            />
            <StatCard
              label="Tier boost"
              value={loading ? "—" : `${boost.toFixed(2)}×`}
              hint={`Your tier: ${tier.toUpperCase()}`}
            />
            <StatCard
              label="Entries this month"
              value={loading ? "—" : entriesThisMonth}
              hint="Used for monthly prize draw"
            />
          </div>

          {/* Lifetime points */}
          <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
            <div className="text-sm text-neutral-400">Lifetime points</div>
            <div className="mt-2 text-2xl font-semibold">{loading ? "—" : lifetimePoints}</div>
            <div className="mt-1 text-xs text-neutral-500">
              Lifetime points build towards milestones and special giveaways.
            </div>
          </div>

          {/* Draw meta */}
          <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
            <div className="font-medium mb-1">Next draw</div>
            <div className="text-sm text-neutral-300">
              Entries close <span className="font-semibold">{drawCutoff}</span>. Winners are selected
              at random from all eligible entries (paid and free routes treated equally).
            </div>
          </div>

          {/* Upgrade nudges when relevant */}
          {showUpgrade && (
            <div className="mt-6 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4">
              <div className="font-medium mb-2">Get more entries every month</div>
              <div className="text-sm text-neutral-200">
                Member earns <span className="font-semibold">1.25×</span> points, Pro earns{" "}
                <span className="font-semibold">1.5×</span>.{" "}
                <button
                  onClick={() => openJoin(tier === "member" ? "pro" : "member")}
                  className="underline underline-offset-2 hover:opacity-90"
                >
                  Upgrade now
                </button>
                .
              </div>
            </div>
          )}
        </>
      )}

      {/* Referrals placeholder (always visible) */}
      <div className="mt-6 rounded-xl border border-dashed border-neutral-800 p-4">
        <div className="font-medium mb-1">Referrals (coming soon)</div>
        <p className="text-sm text-neutral-400">
          Invite a mate, earn bonus points once they become a paid member (after a short verification
          window). We’ll show your invite link and referral-earned points here.
        </p>
      </div>
    </Container>
  );
}