// tradescard-web/app/pricing/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { getCurrentUserId } from '@/src/lib/user';

type Plan = { key:string; tier:'member'|'pro'; cadence:'monthly'|'annual'; priceId:string; label:string };

const API = process.env.NEXT_PUBLIC_API_URL || 'https://tradescard-api.vercel.app';

export default function PricingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/pricing`).then(r => r.json()).then(d => setPlans(d.plans || []));
  }, []);

  const startCheckout = async (priceId: string) => {
    setLoading(true);
    const userId = await getCurrentUserId();
    if (!userId) { alert('Please sign in first.'); setLoading(false); return; }

    const r = await fetch(`${API}/api/checkout`, {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({
        priceId,
        metadata: { user_id: userId },
        successUrl: `${window.location.origin}/account?upgraded=1`,
        cancelUrl: `${window.location.origin}/pricing`,
      }),
    });
    const { url, error } = await r.json();
    setLoading(false);
    if (error) return alert(error);
    window.location.href = url;
  };

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Choose your plan</h1>
      <div className="grid gap-3">
        {plans.map(p => (
          <div key={p.key} className="border border-neutral-800 rounded p-4 flex items-center justify-between">
            <div>
              <div className="font-medium">{p.label}</div>
              <div className="text-sm text-neutral-400">{p.tier.toUpperCase()} · {p.cadence}</div>
            </div>
            <button
              disabled={loading}
              onClick={() => startCheckout(p.priceId)}
              className="px-3 py-2 rounded bg-neutral-200 text-neutral-900"
            >
              {loading ? 'Starting…' : 'Continue'}
            </button>
          </div>
        ))}
        {plans.length === 0 && <p className="text-neutral-400">No plans configured.</p>}
      </div>
    </div>
  );
}