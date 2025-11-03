// app/rewards/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import Container from '@/components/Container';
import PageHeader from '@/components/PageHeader';
import HeaderAuth from '../header-client';

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

type Tier = 'access' | 'member' | 'pro';

const TIER_BOOST: Record<Tier, number> = {
  access: 1.0,
  member: 1.25,
  pro: 1.5,
};

function clsBadge(kind: 'ok' | 'warn' | 'muted') {
  if (kind === 'ok') return 'bg-green-900/30 text-green-300';
  if (kind === 'warn') return 'bg-amber-900/30 text-amber-300';
  return 'bg-neutral-800 text-neutral-300';
}

function endOfThisMonthLocal() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
}

function StatCard(props: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
      <div className="text-sm text-neutral-400">{props.label}</div>
      <div className="mt-2 text-3xl font-semibold">{props.value}</div>
      {props.hint && <div className="mt-1 text-xs text-neutral-500">{props.hint}</div>}
    </div>
  );
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
  const [err, setErr] = useState<string>('');

  const [tier, setTier] = useState<Tier>('access');
  const [acctStatus, setAcctStatus] = useState<string>('free');
  const [pointsThisMonth, setPointsThisMonth] = useState(0);
  const [lifetimePoints, setLifetimePoints] = useState(0);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const boost = TIER_BOOST[tier];
  const entriesThisMonth = Math.floor(pointsThisMonth * boost);
  const drawCutoff = endOfThisMonthLocal().toLocaleString();

  async function currentUser() {
    const { data } = await supabase.auth.getSession();
    return data?.session?.user ?? null;
  }

  async function loadAll() {
    setErr('');
    setLoading(true);
    try {
      const user = await currentUser();

      if (!user) {
        setUserEmail(null);
        setTier('access');
        setAcctStatus('free');
        setPointsThisMonth(0);
        setLifetimePoints(0);
        return;
      }

      setUserEmail(user.email ?? null);

      // 1) account (tier/status)
      const accRes = await fetch(
        `${API_BASE}/api/account?user_id=${encodeURIComponent(user.id)}`,
        { cache: 'no-store' }
      );
      if (!accRes.ok) throw new Error(`Account failed (${accRes.status})`);
      const acc: AccountResp = await accRes.json();

      const t = (acc.members?.tier as Tier) ?? 'access';
      const s = acc.members?.status ?? 'free';
      setTier(['access', 'member', 'pro'].includes(t) ? t : 'access');
      setAcctStatus(s);

      // 2) rewards summary
      const rewRes = await fetch(
        `${API_BASE}/api/rewards/summary?user_id=${encodeURIComponent(user.id)}`,
        { cache: 'no-store' }
      );
      if (!rewRes.ok) throw new Error(`Rewards failed (${rewRes.status})`);
      const rew: RewardsResp = await rewRes.json();

      setPointsThisMonth(rew.points_this_month ?? 0);
      setLifetimePoints(rew.lifetime_points ?? 0);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // clean URL after Stripe/Auth
    const url = new URL(window.location.href);
    if (
      url.searchParams.has('status') ||
      url.searchParams.has('success') ||
      url.searchParams.has('canceled') ||
      url.searchParams.has('auth_error')
    ) {
      window.history.replaceState({}, '', url.pathname);
    }
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showUpgrade =
    tier === 'access' || (acctStatus !== 'active' && acctStatus !== 'trialing');

  return (
    <Container>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <PageHeader
          title="Rewards"
          subtitle="Earn points every month you’re a member. Higher tiers boost your points. Points become entries for our weekly and monthly prize draws."
        />
        {!loading && (
          <div className="text-sm text-neutral-500">
            <span className="rounded bg-neutral-800 px-2 py-0.5 mr-2">{tier.toUpperCase()}</span>
            <span
              className={`rounded px-2 py-0.5 ${
                acctStatus === 'active'
                  ? clsBadge('ok')
                  : acctStatus === 'trialing'
                  ? clsBadge('warn')
                  : clsBadge('muted')
              }`}
            >
              {acctStatus}
            </span>
          </div>
        )}
      </div>

      {err && (
        <div className="mb-4 rounded border border-red-600/40 bg-red-900/10 px-3 py-2 text-red-300">
          {err}
        </div>
      )}

      {!loading && !userEmail && (
        <div className="mb-4 rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
          <div className="font-medium mb-2">You’re not signed in.</div>
          <p className="text-neutral-400 mb-3 text-sm">
            Enter your email to get a magic sign-in link and see your rewards.
          </p>
          <HeaderAuth />
        </div>
      )}

      <div className="mb-4">
        <button
          onClick={loadAll}
          disabled={loading}
          className="px-3 py-1 rounded bg-neutral-800 hover:bg-neutral-700 disabled:opacity-60"
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* Stats row */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Points this month (base)"
          value={loading ? '—' : pointsThisMonth}
          hint="Base points earned this billing month"
        />
        <StatCard
          label="Tier boost"
          value={loading ? '—' : `${boost.toFixed(2)}×`}
          hint={`Upgrade for more entries • ${tier.toUpperCase()}`}
        />
        <StatCard
          label="Entries this month"
          value={loading ? '—' : entriesThisMonth}
          hint="Used for monthly prize draw"
        />
      </div>

      {/* Lifetime points */}
      <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
        <div className="text-sm text-neutral-400">Lifetime points</div>
        <div className="mt-2 text-2xl font-semibold">{loading ? '—' : lifetimePoints}</div>
        <div className="mt-1 text-xs text-neutral-500">
          Lifetime points build towards milestones and special giveaways.
        </div>
      </div>

      {/* Draw meta + disclosure */}
      <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
        <div className="font-medium mb-1">Next draw</div>
        <div className="text-sm text-neutral-300">
          Entries close <span className="font-semibold">{drawCutoff}</span>. Winners are selected
          at random from all eligible entries (paid and free routes treated equally).
        </div>
        {(showUpgrade || tier === 'access') && (
          <div className="mt-3 text-sm text-neutral-400">
            <span className="font-medium">Free entry route:</span> No purchase necessary. Instructions
            are shown on public promotional pages. Postal entries receive the same chance to win.
          </div>
        )}
      </div>

      {/* Upgrade / actions */}
      {showUpgrade && (
        <div className="mt-6 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4">
          <div className="font-medium mb-2">Get more entries every month</div>
          <div className="text-sm text-neutral-800 md:text-neutral-900">
            Member earns <span className="font-semibold">1.25×</span> points, Pro earns{' '}
            <span className="font-semibold">1.5×</span>. Upgrade from your{' '}
            <a href="/account" className="underline">
              Account
            </a>{' '}
            page.
          </div>
        </div>
      )}

      {/* How it works */}
      <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
        <div className="font-medium mb-1">How it works</div>
        <ul className="list-disc list-inside text-neutral-300 space-y-1 text-sm">
          <li>Earn points each billing month you’re an active paid member.</li>
          <li>Your tier boosts points: Access 1.0×, Member 1.25×, Pro 1.5×.</li>
          <li>Points convert to entries for weekly spot prizes and a monthly draw.</li>
          <li>No purchase necessary — free alternative entry route available.</li>
        </ul>
      </div>

      {/* Referrals placeholder */}
      <div className="mt-6 rounded-xl border border-dashed border-neutral-800 p-4">
        <div className="font-medium mb-1">Referrals (coming soon)</div>
        <p className="text-sm text-neutral-400">
          Invite a mate, earn bonus points once they become a paid member (after a short
          verification window). We’ll show your invite link and referral-earned points here.
        </p>
      </div>
    </Container>
  );
}