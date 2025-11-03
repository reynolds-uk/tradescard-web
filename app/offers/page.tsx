// app/offers/page.tsx  (public catalogue)
'use client';
import { useEffect, useMemo, useState } from 'react';
import Container from '@/src/components/Container';
import { PageHeader } from '@/src/components/PageHeader';
import { OfferCard } from '@/src/components/OfferCard';
import { createClient } from '@supabase/supabase-js';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  'https://tradescard-api.vercel.app';

type Offer = Parameters<typeof OfferCard>[0]['offer'];

export default function OffersPage() {
  const supabase = useMemo(
    () => createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ),
    []
  );

  const [items, setItems] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch(`${API_BASE}/api/offers?visibility=public`, { cache: 'no-store' });
    const data = await res.json();
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const onRedeem = async (o: Offer) => {
    // optional: associate click with user if signed in
    const { data } = await supabase.auth.getSession();
    const userId = data?.session?.user?.id;
    try {
      await fetch(`${API_BASE}/api/redemptions/click`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offer_id: o.id, user_id: userId || null }),
      });
    } catch {}
    if (o.link) window.open(o.link, '_blank', 'noopener,noreferrer');
  };

  return (
    <Container>
      <PageHeader
        title="Offers"
        subtitle="Curated savings for the trade. Full catalogue for Members/Pro."
      />
      {loading ? (
        <div className="grid gap-3 md:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-28 rounded-xl border border-neutral-800 bg-neutral-900 animate-pulse" />
          ))}
        </div>
      ) : items.length ? (
        <div className="grid gap-3 md:grid-cols-3">
          {items.map(o => (
            <OfferCard key={o.id} offer={o} onRedeem={onRedeem} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
          No public offers yet — join free to see more.
        </div>
      )}
    </Container>
  );
}