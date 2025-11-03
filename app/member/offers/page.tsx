'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import Container from '@/components/Container';
import PageHeader from '@/components/PageHeader';
import { OfferCard, type Offer as OfferModel } from '@/components/OfferCard';
import JoinModal from '@/components/JoinModal';
import { useJoinActions } from '@/components/useJoinActions';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  'https://tradescard-api.vercel.app';

type Tier = 'access' | 'member' | 'pro';

export default function MemberOffersPage() {
  const supabase = useMemo(
    () => createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ),
    []
  );

  const [me, setMe] = useState<{ tier: Tier; status: string } | null>(null);
  const [items, setItems] = useState<OfferModel[]>([]);
  const [loading, setLoading] = useState(true);

  // if a non-eligible user lands here, we’ll show the funnel and bounce back
  const next = typeof window !== 'undefined' ? window.location.pathname : '/member/offers';
  const { busy, error, joinFree, startMembership } = useJoinActions(next);
  const [joinOpen, setJoinOpen] = useState(false);

  useEffect(() => {
    let aborted = false;

    (async () => {
      setLoading(true);

      // who am I?
      const { data } = await supabase.auth.getSession();
      const user = data?.session?.user ?? null;

      if (user) {
        const r = await fetch(`${API_BASE}/api/account?user_id=${encodeURIComponent(user.id)}`, { cache: 'no-store' });
        if (r.ok) {
          const j = await r.json();
          const tier: Tier = (j?.members?.tier as Tier) ?? 'access';
          const status: string = j?.members?.status ?? 'free';
          if (!aborted) setMe({ tier, status });

          // if not eligible for member offers, open join sheet
          if (!aborted && !(status === 'active' && (tier === 'member' || tier === 'pro'))) {
            setJoinOpen(true);
          }
        } else if (!aborted) {
          setMe(null);
          setJoinOpen(true);
        }
      } else {
        if (!aborted) setMe(null);
        setJoinOpen(true);
      }

      // fetch member catalogue
      try {
        const res = await fetch(`${API_BASE}/api/offers?visibility=member`, { cache: 'no-store' });
        const list = await res.json().catch(() => []);
        if (!aborted) setItems(Array.isArray(list) ? (list as OfferModel[]) : []);
      } catch {
        if (!aborted) setItems([]);
      }

      if (!aborted) setLoading(false);
    })();

    return () => { aborted = true; };
  }, [supabase]);

  const onRedeem = (o: OfferModel) => {
    // Guard: if someone slipped through and isn’t eligible, show funnel
    const eligible = me && me.status === 'active' && (me.tier === 'member' || me.tier === 'pro');
    if (!eligible) {
      setJoinOpen(true);
      return;
    }
    // Track + open
    fetch(`${API_BASE}/api/redemptions/click`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ offer_id: o.id }),
      keepalive: true,
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
            <OfferCard key={o.id} offer={o} onRedeem={() => onRedeem(o)} />
          ))}
        </div>
      )}

      <JoinModal
        open={joinOpen}
        onClose={() => setJoinOpen(false)}
        onJoinFree={joinFree}
        onMember={() => startMembership('member')}
        onPro={() => startMembership('pro')}
        busy={busy}
        error={error}
      />
    </Container>
  );
}