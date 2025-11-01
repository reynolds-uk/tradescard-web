'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { fetchRewardsSummary } from '@/src/lib/api';

type Summary = {
  total_points?: number;
  month?: number;
  lifetime?: number;
};

type ApiAccount = {
  user_id: string;
  email: string;
  full_name?: string | null;
  members: null | {
    status: string; // active | trialing | past_due | canceled | free
    tier: 'access' | 'member' | 'pro' | string;
    current_period_end: string | null;
  };
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  'https://tradescard-api.vercel.app';

const DEMO_USER = '11111111-1111-1111-1111-111111111111';

// Configureable tier multipliers
const TIER_MULTIPLIER: Record<string, number> = {
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

  const [userId, setUserId] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [tier, setTier] = useState<'access' | 'member' | 'pro' | string>('access');
  const [status, setStatus] = useState<string>('free');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        // Resolve user
        const { data } = await supabase.auth.getSession();
        const uid = data?.session?.user?.id ?? DEMO_USER;
        setUserId(uid);

        // Fetch rewards summary
        const s = await fetchRewardsSummary(uid);
        setSummary(s ?? { total_points: 0, month: 0, lifetime: 0 });

        // Fetch account/tier
        const r = await fetch(`${API_BASE}/api/account?user_id=${encodeURIComponent(uid)}`, {
          cache: 'no-store',
        });
        if (r.ok) {
          const a: ApiAccount = await r.json();
          setTier((a.members?.tier as any) ?? 'access');
          setStatus(a.members?.status ?? 'free');
        } else {
          // Non-fatal: keep defaults
          console.warn('Account fetch failed', r.status);
        }
      } catch (e: any) {
        setErr(e?.message || 'Something went wrong');
      } finally {
        setLoading(false);
      }
    })();
  }, [supabase]);

  const monthBase = summary?.month ?? summary?.total_points ?? 0;
  const lifetime = summary?.lifetime ?? summary?.total_points ?? 0;
  const boost = TIER_MULTIPLIER[tier] ?? 1.0;
  const monthEntries = Math.max(0, Math.round(monthBase * boost));

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Rewards</h1>
        <p className="text-sm text-neutral-400">
          Earn points every month you’re a member. Higher tiers boost your points. Points win prizes — we run weekly and monthly draws.
        </p>
      </header>

      {err && <p className="text-red-400">Error: {err}</p>}
      {loading && !err && <p className="text-neutral-400">Loading…</p>}

      {!loading && !err && (
        <>
          {/* Stat cards */}
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
              <div className="text-sm text-neutral-400">Points this month (base)</div>
              <div className="mt-2 text-3xl font-semibold">{monthBase}</div>
            </div>
            <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
              <div className="flex items-center justify-between">
                <div className="text-sm text-neutral-400">Tier boost</div>
                <span className="rounded bg-neutral-800 px-2 py-0.5 text-xs uppercase">{tier}</span>
              </div>
              <div className="mt-2 text-3xl font-semibold">{boost.toFixed(2)}×</div>
              <div className="mt-1 text-xs text-neutral-500">
                {status === 'active' ? 'Active membership' : 'Upgrade for more entries'}
              </div>
            </div>
            <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
              <div className="text-sm text-neutral-400">Entries this month</div>
              <div className="mt-2 text-3xl font-semibold">{monthEntries}</div>
              <div className="mt-1 text-xs text-neutral-500">Used for monthly prize draw</div>
            </div>
          </div>

          {/* Lifetime */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
            <div className="text-sm text-neutral-400">Lifetime points</div>
            <div className="mt-2 text-2xl font-semibold">{lifetime}</div>
            <div className="mt-1 text-xs text-neutral-500">
              Lifetime points help with long-term milestones and special giveaways.
            </div>
          </div>

          {/* How it works + CTAs */}
          <div className="rounded-lg border border-neutral-800 p-5">
            <div className="font-medium mb-2">How it works</div>
            <ul className="list-disc list-inside text-neutral-300 space-y-1 text-sm">
              <li>Earn points every billing month you’re an active member.</li>
              <li>Your tier applies a boost: Access 1×, Member 1.25×, Pro 1.5×.</li>
              <li>Points = entries. We run weekly spot prizes and a monthly draw.</li>
            </ul>

            {(tier === 'access' || status !== 'active') && (
              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  href="/account"
                  className="px-4 py-2 rounded-lg bg-amber-400 text-black font-medium"
                >
                  Upgrade to boost entries
                </a>
                <a
                  href="/"
                  className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700"
                >
                  See offers
                </a>
              </div>
            )}
          </div>

          {/* Debug / visibility note */}
          {userId === DEMO_USER && (
            <p className="text-xs text-neutral-500">
              Viewing demo data. Sign in to see your real points.
            </p>
          )}
        </>
      )}
    </div>
  );
}