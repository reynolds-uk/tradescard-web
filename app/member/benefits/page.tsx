// app/member/benefits/page.tsx
"use client";

import { useEffect, useState } from "react";
import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://tradescard-api.vercel.app";

type Benefit = {
  id: string;
  title: string;
  description?: string | null;
  tier: "member" | "pro";
  link?: string | null;
  priority: number;
};

export default function MemberBenefits() {
  const [items, setItems] = useState<Benefit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/api/benefits`, { cache: "no-store" });
        if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
        const data = await res.json();
        const sorted = Array.isArray(data)
          ? data.sort((a, b) => b.priority - a.priority)
          : [];
        setItems(sorted);
      } catch (err) {
        console.error("Error fetching benefits:", err);
        setItems([]);
      } finally {
        setLoading(false);
      }
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
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-28 rounded-xl border border-neutral-800 bg-neutral-900 animate-pulse"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-neutral-400 text-sm">No active benefits available.</div>
      ) : (
        <div className="grid gap-3 md:grid-cols-3">
          {items.map((b) => (
            <div
              key={b.id}
              className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 hover:bg-neutral-900 transition"
            >
              <div className="text-sm font-medium">{b.title}</div>
              {b.description && (
                <p className="mt-1 text-sm text-neutral-400">{b.description}</p>
              )}
              {b.link && (
                <a
                  href={b.link}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-block text-sm text-amber-400 hover:text-amber-300 underline underline-offset-2"
                >
                  How to use
                </a>
              )}
              <div className="mt-3 text-xs rounded bg-neutral-800 px-2 py-0.5 w-fit text-neutral-300">
                {b.tier.toUpperCase()}
              </div>
            </div>
          ))}
        </div>
      )}
    </Container>
  );
}