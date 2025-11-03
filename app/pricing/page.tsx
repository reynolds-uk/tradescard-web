// app/pricing/page.tsx
'use client';

import { useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  'https://tradescard-api.vercel.app';

type PlanKey = 'member' | 'pro';

const PLANS: Array<{
  key: PlanKey;
  label: string;
  priceMonthly: string;
  priceAnnual: string;
  blurb: string;
  features: string[];
}> = [
  {
    key: 'member',
    label: 'Member',
    priceMonthly: '£2.99/mo',
    priceAnnual: '£29/yr',
    blurb: 'Full offer catalogue + Protect Lite.',
    features: [
      'All member offers',
      'Protect Lite benefits',
      'Monthly prize entry',
      'Digital card',
    ],
  },
  {
    key: 'pro',
    label: 'Pro',
    priceMonthly: '£7.99/mo',
    priceAnnual: '£79/yr',
    blurb: 'Double entries + early access & Pro-only deals.',
    features: [
      'Everything in Member',
      'Early-access deals',
      'Pro-only offers',
      'Double prize entries',
    ],
  },
];

export default function PricingPage() {
  const supabase = useMemo(
    () =>
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>('');
  const [cadence, setCadence] = useState<'monthly' | 'annual'>('monthly');

  async function currentUser() {
    const { data } = await supabase.auth.getSession();
    return data?.session?.user ?? null;
    // If null, the user isn’t signed in.
  }

  const startCheckout = async (plan: PlanKey) => {
    try {
      setBusy(true);
      setError('');

      const user = await currentUser();
      if (!user) {
        alert('Please sign in first using the form at the top right.');
        return;
      }

      // NOTE: Your API currently expects { plan: 'member' | 'pro' }.
      // If/when you support annual on the API, include cadence too.
      const res = await fetch(`${API_BASE}/api/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          email: user.email,
          plan,            // 'member' | 'pro'
          cadence,         // harmless extra for future API support
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.url) {
        throw new Error(json?.error || `Checkout failed (${res.status})`);
      }
      window.location.href = json.url;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not start checkout';
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 text-neutral-200">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold">Pricing</h1>
        <p className="text-neutral-400">
          Choose a plan. You can switch or cancel any time.
        </p>
      </header>

      {/* Cadence toggle */}
      <div className="mb-6 inline-flex rounded-lg border border-neutral-800 bg-neutral-900 p-1">
        <button
          onClick={() => setCadence('monthly')}
          className={`px-3 py-1 rounded-md text-sm ${
            cadence === 'monthly'
              ? 'bg-neutral-800'
              : 'hover:bg-neutral-800/60'
          }`}
        >
          Monthly
        </button>
        <button
          onClick={() => setCadence('annual')}
          className={`px-3 py-1 rounded-md text-sm ${
            cadence === 'annual'
              ? 'bg-neutral-800'
              : 'hover:bg-neutral-800/60'
          }`}
        >
          Annual (save ~2 months)
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded border border-red-600/40 bg-red-900/10 px-3 py-2 text-red-300">
          Error: {error}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-2">
        {PLANS.map((p) => (
          <div
            key={p.key}
            className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-semibold">{p.label}</div>
                <div className="text-neutral-400">{p.blurb}</div>
              </div>
              <div className="text-right">
                <div className="text-xl font-semibold">
                  {cadence === 'monthly' ? p.priceMonthly : p.priceAnnual}
                </div>
                <div className="text-xs text-neutral-500">
                  {cadence === 'monthly' ? 'billed monthly' : 'billed annually'}
                </div>
              </div>
            </div>

            <ul className="mt-4 space-y-1 text-sm text-neutral-300">
              {p.features.map((f) => (
                <li key={f}>• {f}</li>
              ))}
            </ul>

            <div className="mt-5">
              <button
                onClick={() => startCheckout(p.key)}
                disabled={busy}
                className={`w-full rounded-lg px-4 py-2 font-medium ${
                  p.key === 'member'
                    ? 'bg-amber-400 text-black'
                    : 'bg-neutral-800 hover:bg-neutral-700'
                } disabled:opacity-60`}
              >
                {busy ? 'Opening…' : `Choose ${p.label}`}
              </button>
            </div>
          </div>
        ))}
      </section>

      <p className="mt-6 text-xs text-neutral-500">
        Have a question about plans? Manage or cancel any time in{' '}
        <a href="/account" className="underline">
          My Account
        </a>
        .
      </p>
    </main>
  );
}