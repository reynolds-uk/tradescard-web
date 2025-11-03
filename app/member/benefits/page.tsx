// app/member/benefits/page.tsx
'use client';
import { useEffect, useState } from 'react';
import Container from '@/src/components/Container';
import { PageHeader } from '@/src/components/PageHeader';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  'https://tradescard-api.vercel.app';

type Benefit = {
  id: string;
  title: string;
  description?: string | null;
  tier: 'member' | 'pro';
  link?: string | null;
  priority: number;
};

export default function MemberBenefits() {
  const [items, setItems] = useState<Benefit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/benefits`, { cache: 'no-store' });
      const data = await res.json();
      setItems(Array.isArray(data) ? data.sort((a, b) => b.priority - a.priority) : []);
      setLoading(false);
    })();
  }, []);

  return (
    <Container>
      <PageHeader
        title="Member Benefits"
        subtitle="Included protection and support for paid members."
      />
      {loading ? (
        <div className="grid gap-3 md:grid-cols-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded-xl border border-neutral-800 bg-neutral-900 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-3">
          {items.map(b => (
            <div key={b.id} className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
              <div className="text-sm font-medium">{b.title}</div>
              {b.description && (
                <div className="mt-1 text-sm text-neutral-400">{b.description}</div>
              )}
              {b.link && (
                <a
                  href={b.link}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-block text-sm underline underline-offset-2"
                >
                  How to use
                </a>
              )}
              <div className="mt-3 text-xs rounded bg-neutral-800 px-2 py-0.5 w-fit">
                {b.tier.toUpperCase()}
              </div>
            </div>
          ))}
        </div>
      )}
    </Container>
  );
}