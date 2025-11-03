'use client';

import { useEffect, useState } from 'react';
import Container from '@/components/Container';
import PageHeader from '@/components/PageHeader';
import { OfferCard, type Offer as OfferModel } from '@/components/OfferCard';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  'https://tradescard-api.vercel.app';

export default function PublicOffersPage() {
  const [items, setItems] = useState<OfferModel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let aborted = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/api/offers?visibility=access`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`offers ${res.status}`);
        const data: unknown = await res.json();
        if (!aborted) setItems(Array.isArray(data) ? (data as OfferModel[]) : []);
      } catch {
        if (!aborted) setItems([]);
      } finally {
        if (!aborted) setLoading(false);
      }
    })();
    return () => {
      aborted = true;
    };
  }, []);

  const promptJoin = () => (window.location.href = '/join');

  return (
    <Container>
      <PageHeader
        title="Offers"
        subtitle="Curated savings for the trade. Join free to unlock your first set of offers."
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
            <OfferCard key={o.id} offer={o} locked onRedeem={promptJoin} />
          ))}
        </div>
      )}
    </Container>
  );
}