// app/offers/page.tsx (diff-friendly excerpt)
"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import { OfferCard, type Offer } from "@/components/OfferCard";
import JoinModal from "@/components/JoinModal";
import { useJoinActions } from "@/components/useJoinActions";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://tradescard-api.vercel.app";

type Tier = "access" | "member" | "pro";

export default function OffersPage() {
  const supabase = useMemo(
    () => createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ),
    []
  );

  const [me, setMe] = useState<{ tier: Tier; status: string } | null>(null);
  const [items, setItems] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);

  // where to return after auth/checkout
  const next = typeof window !== "undefined" ? window.location.pathname : "/offers";
  const { busy, error, joinFree, startMembership } = useJoinActions(next);

  const [joinOpen, setJoinOpen] = useState(false);
  const [pendingOffer, setPendingOffer] = useState<Offer | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);

      // session
      const { data } = await supabase.auth.getSession();
      const user = data?.session?.user ?? null;

      if (user) {
        const r = await fetch(`${API_BASE}/api/account?user_id=${encodeURIComponent(user.id)}`, { cache: "no-store" });
        if (r.ok) {
          const j = await r.json();
          setMe({
            tier: (j?.members?.tier as Tier) ?? "access",
            status: j?.members?.status ?? "free",
          });
        } else {
          setMe(null);
        }
      } else {
        setMe(null);
      }

      // catalogue
      const res = await fetch(`${API_BASE}/api/offers?visibility=access`, { cache: "no-store" });
      const dataList = await res.json().catch(() => []);
      setItems(Array.isArray(dataList) ? dataList : []);

      setLoading(false);
    })();
  }, [supabase]);

  const isEligible =
    me && me.status === "active" && (me.tier === "member" || me.tier === "pro");

  const redeem = (o: Offer) => {
    if (!isEligible) {
      setPendingOffer(o);
      setJoinOpen(true);
      return;
    }
    // eligible path: track + open
    fetch(`${API_BASE}/api/redemptions/click`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offer_id: o.id }),
    }).catch(() => {});
    if (o.link) window.open(o.link, "_blank", "noopener,noreferrer");
  };

  return (
    <Container>
      <PageHeader title="Offers" subtitle="Curated savings for the trade. Full catalogue for Members/Pro." />

      {loading ? (
        <div className="grid gap-3 md:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-28 rounded-xl border border-neutral-800 bg-neutral-900 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-3">
          {items.map((o) => (
            <OfferCard key={o.id} offer={o} onRedeem={() => redeem(o)} />
          ))}
        </div>
      )}

      {/* unified funnel modal */}
      <JoinModal
        open={joinOpen}
        onClose={() => setJoinOpen(false)}
        onJoinFree={joinFree}
        onMember={() => startMembership("member")}
        onPro={() => startMembership("pro")}
        busy={busy}
        error={error}
      />
    </Container>
  );
}