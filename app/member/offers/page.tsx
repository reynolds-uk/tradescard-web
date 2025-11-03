// app/member/offers/page.tsx
"use client";

import { useEffect, useState } from "react";
import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import { OfferCard, type Offer } from "@/components/OfferCard";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://tradescard-api.vercel.app";

type Offer = {
  id: string;
  title: string;
  category?: string | null;
  partner?: string | null;
  link?: string | null;
  visibility?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  is_active?: boolean;
};

export default function MemberOffersPage() {
  const [items, setItems] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/api/offers?visibility=member`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`Failed to fetch offers: ${res.status}`);
        const data = await res.json();
        setItems(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error fetching offers:", err);
        setItems([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const onRedeem = (o: Offer) => {
    // Fire-and-forget redemption tracking
    fetch(`${API_BASE}/api/redemptions/click`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offer_id: o.id }),
    }).catch(() => {});

    if (o.link) window.open(o.link, "_blank", "noopener,noreferrer");
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
            <div
              key={i}
              className="h-28 rounded-xl border border-neutral-800 bg-neutral-900 animate-pulse"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-neutral-400 text-sm">No current offers available.</div>
      ) : (
        <div className="grid gap-3 md:grid-cols-3">
          {items.map((o) => (
            <OfferCard
              key={o.id}
              id={o.id}
              title={o.title}
              partner={o.partner ?? undefined}
              category={o.category ?? undefined}
              link={o.link ?? undefined}
              badge={o.visibility === "member" ? "Member Only" : undefined}
              onClick={() => onRedeem(o)}
            />
          ))}
        </div>
      )}
    </Container>
  );
}