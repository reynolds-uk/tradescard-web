'use client';

import { useEffect, useState } from 'react';
import { fetchRewardsSummary } from '@/src/lib/api';

const DEMO_USER = '11111111-1111-1111-1111-111111111111'; // swap when you wire auth

export default function RewardsPage() {
  const [points, setPoints] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetchRewardsSummary(DEMO_USER)
      .then(r => setPoints(r.total_points ?? 0))
      .catch(e => setErr(e.message));
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Rewards</h1>
        <p className="text-sm text-neutral-400">Your running monthly entries.</p>
      </header>

      {err && <p className="text-red-400">Error: {err}</p>}
      {points === null && !err && <p className="text-neutral-400">Loading…</p>}

      {points !== null && (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
          <p className="text-neutral-300">Total points</p>
          <p className="text-4xl font-semibold mt-2">{points}</p>
        </div>
      )}
    </div>
  );
}