// app/member/offers/page.tsx  (member-only catalogue)
'use client';
import { useEffect, useState } from 'react';
import Container from '@/src/components/Container';
import { PageHeader } from '@/src/components/PageHeader';
import { OfferCard } from '@/src/components/OfferCard';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  'https://tradescard-api.vercel.app';

type Offer = Parameters<typeof OfferCard>[0]['offer'];

export default function MemberOffersPage() {
  const [items, setItems] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/offers?visibility=member`, { cache: 'no-store' });
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
      setLoading(false);
    })();
  }, []);

  const onRedeem = (o: Offer) => {
    fetch(`${API_BASE}/api/redemptions/click`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ offer_id: o.id }),
    }).catch(() => {});
    if (o.link) window.open(o.link, '_blank', 'noopener,noreferrer');
  };

  return (
    <Container>
      <PageHeader
        title="Member Offers"
        subtitle="Exclusive and early-access deals for paid members."
      />
      {loading ? (
        <div className="grid gap-3 md:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-28 rounded-xl border border-neutral-800 bg-neutral-900 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-3">
          {items.map(o => (
            <OfferCard key={o.id} offer={o} onRedeem={onRedeem} />
          ))}
        </div>
      )}
    </Container>
  );
}