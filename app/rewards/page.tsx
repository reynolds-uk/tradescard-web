// app/rewards/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Container from '@/components/Container';
import PageHeader from '@/components/PageHeader';
import { createClient } from '@supabase/supabase-js';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  'https://tradescard-api.vercel.app';

type RewardsResp = {
  lifetime_points: number;
  points_this_month: number;
};

type AccountResp = {
  user_id: string;
  email: string;
  full_name?: string | null;
  members: null | {
    status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'free' | string;
    tier: 'access' | 'member' | 'pro' | string;
    current_period_end: string | null;
  };
};

const TIER_BOOST: Record<'access' | 'member' | 'pro', number> = {
  access: 1.0,
  member: 1.25,
  pro: 1.5,
};

function badgeClasses(kind: 'ok' | 'warn' | 'muted') {
  if (kind === 'ok') return 'bg-green-900/30 text-green-300';
  if (kind === 'warn') return 'bg-amber-900/30 text-amber-300';
  return 'bg-neutral-800 text-neutral-300';
}

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
  const [error, setError] = useState<string>('');

  const [tier, setTier] = useState<'access' | 'member' | 'pro'>('access');
  const [status, setStatus] = useState<string>('free');
  const [pointsThisMonth, setPointsThisMonth] = useState(0);
  const [lifetimePoints, setLifetimePoints] = useState(0);

  const boost = TIER_BOOST[tier];

  async function getUser() {
    const { data } = await supabase.auth.getSession();
    return data?.session?.user ?? null;
  }

  async function loadData() {
    setError('');
    setLoading(true);
    try {
      const user = await getUser();
      if (!user) {
        // Logged-out users shouldn’t really be here, but handle gracefully
        setTier('access');
        setStatus('free');
        setPointsThisMonth(0);
        setLifetimePoints(0);
        return;
      }

      // Fetch account (tier/status)
      const accRes = await fetch(
        `${API_BASE}/api/account?user_id=${encodeURIComponent(user.id)}`,
        { cache: 'no-store' }
      );
      if (!accRes.ok) throw new Error(`Account failed (${accRes.status})`);
      const acc: AccountResp = await accRes.json();

      const t = (acc.members?.tier as 'access' | 'member' | 'pro') ?? 'access';
      const s = acc.members?.status ?? 'free';
      setTier(['access', 'member', 'pro'].includes(t) ? t : 'access');
      setStatus(s);

      // Fetch rewards summary
      const rewRes = await fetch(
        `${API_BASE}/api/rewards/summary?user_id=${encodeURIComponent(user.id)}`,
        { cache: 'no-store' }
      );
      if (!rewRes.ok) throw new Error(`Rewards failed (${rewRes.status})`);
      const rew: RewardsResp = await rewRes.json();

      setPointsThisMonth(rew.points_this_month ?? 0);
      setLifetimePoints(rew.lifetime_points ?? 0);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Something went wrong';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // strip query params after Stripe/redirects for a clean URL
    const url = new URL(window.location.href);
    if (
      url.searchParams.has('status') ||
      url.searchParams.has('success') ||
      url.searchParams.has('canceled') ||
      url.searchParams.has('auth_error')
    ) {
      window.history.replaceState({}, '', url.pathname);
    }
    // load data
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Container>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <PageHeader
          title="Rewards"
          subtitle="Earn points every month you’re a member. Higher tiers boost your points. Points win prizes — we run weekly and monthly draws."
        />
        {!loading && (
          <div className="text-sm text-neutral-500">
            <span className="rounded bg-neutral-800 px-2 py-0.5 mr-2">
              {tier.toUpperCase()}
            </span>
            <span
              className={`rounded px-2 py-0.5 ${
                status === 'active'
                  ? badgeClasses('ok')
                  : status === 'trialing'
                  ? badgeClasses('warn')
                  : badgeClasses('muted')
              }`}
            >
              {status}
            </span>
          </div>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 rounded border border-red-600/40 bg-red-900/10 px-3 py-2 text-red-300">
          {error}
        </div>
      )}

      {/* Refresh button */}
      <div className="mb-4">
        <button
          onClick={loadData}
          disabled={loading}
          className="px-3 py-1 rounded bg-neutral-800 hover:bg-neutral-700 disabled:opacity-60"
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Points this month (base) */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <div className="text-sm text-neutral-400">Points this month (base)</div>
          <div className="mt-2 text-3xl font-semibold">
            {loading ? '—' : pointsThisMonth}
          </div>
          <div className="mt-1 text-xs text-neutral-500">
            Base points earned this billing month
          </div>
        </div>

        {/* Tier boost */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <div className="text-sm text-neutral-400">Tier boost</div>
          <div className="mt-2 text-3xl font-semibold">
            {loading ? '—' : `${boost.toFixed(2)}×`}
          </div>
          <div className="mt-1 text-xs text-neutral-500 flex items-center gap-2">
            Upgrade for more entries
            <span className="rounded bg-neutral-800 px-2 py-0.5 text-[11px]">
              {tier.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Entries this month (derived) */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <div className="text-sm text-neutral-400">Entries this month</div>
          <div className="mt-2 text-3xl font-semibold">
            {loading ? '—' : Math.floor(pointsThisMonth * boost)}
          </div>
          <div className="mt-1 text-xs text-neutral-500">
            Used for monthly prize draw
          </div>
        </div>
      </div>

      {/* Lifetime / timeline */}
      <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
        <div className="text-sm text-neutral-400">Lifetime points</div>
        <div className="mt-2 text-2xl font-semibold">
          {loading ? '—' : lifetimePoints}
        </div>
        <div className="mt-1 text-xs text-neutral-500">
          Lifetime points help with long-term milestones and special giveaways.
        </div>
      </div>

      {/* How it works */}
      <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
        <div className="font-medium mb-1">How it works</div>
        <ul className="list-disc list-inside text-neutral-300 space-y-1 text-sm">
          <li>Earn points every billing month you’re an active paid member.</li>
          <li>Your tier boosts points: Access 1.0×, Member 1.25×, Pro 1.5×.</li>
          <li>Points = entries. We run weekly spot prizes and a monthly draw.</li>
        </ul>
      </div>

      {/* Referrals (stub, ready to wire up) */}
      <div className="mt-6 rounded-xl border border-dashed border-neutral-800 p-4">
        <div className="font-medium mb-1">Referrals (coming soon)</div>
        <p className="text-sm text-neutral-400">
          Invite a mate, earn bonus points. We’ll add your personal invite link here and
          show referral-earned points as a separate line in your monthly summary.
        </p>
      </div>
    </Container>
  );
}