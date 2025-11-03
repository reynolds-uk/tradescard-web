// app/offers/page.tsx
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
  // Supabase (client)
  const supabase = useMemo(
    () =>
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  // State
  const [me, setMe] = useState<{ tier: Tier; status: string } | null>(null);
  const [items, setItems] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchErr, setFetchErr] = useState<string>("");

  // Where to bounce back after auth/checkout
  const next = typeof window !== "undefined" ? window.location.pathname : "/offers";
  const { busy, error, joinFree, startMembership } = useJoinActions(next);

  // Modal
  const [joinOpen, setJoinOpen] = useState(false);

  useEffect(() => {
    let aborted = false;

    (async () => {
      try {
        setLoading(true);
        setFetchErr("");

        // session → account
        const { data } = await supabase.auth.getSession();
        const user = data?.session?.user ?? null;

        if (user) {
          const r = await fetch(
            `${API_BASE}/api/account?user_id=${encodeURIComponent(user.id)}`,
            { cache: "no-store" }
          );
          if (r.ok) {
            const j = await r.json();
            if (!aborted) {
              setMe({
                tier: ((j?.members?.tier as Tier) ?? "access") as Tier,
                status: j?.members?.status ?? "free",
              });
            }
          } else if (!aborted) {
            setMe(null);
          }
        } else if (!aborted) {
          setMe(null);
        }

        // catalogue (public-facing list; redemption is gated)
        const res = await fetch(`${API_BASE}/api/offers?visibility=access`, {
          cache: "no-store",
        });
        const dataList = await res.json().catch(() => []);
        if (!aborted) {
          setItems(Array.isArray(dataList) ? (dataList as Offer[]) : []);
        }
      } catch (e: unknown) {
        if (!aborted) {
          setFetchErr(
            e instanceof Error ? e.message : "Failed to load offers. Please try again."
          );
          setItems([]);
        }
      } finally {
        if (!aborted) setLoading(false);
      }
    })();

    return () => {
      aborted = true;
    };
  }, [supabase]);

  const isEligible =
    me && me.status === "active" && (me.tier === "member" || me.tier === "pro");

  const redeem = (o: Offer) => {
    if (!isEligible) {
      // Gate with the unified join modal
      setJoinOpen(true);
      return;
    }
    // Eligible path: track click then open target
    fetch(`${API_BASE}/api/redemptions/click`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offer_id: o.id }),
      keepalive: true,
    }).catch(() => {});
    if (o.link) window.open(o.link, "_blank", "noopener,noreferrer");
  };

  return (
    <Container>
      <PageHeader
        title="Offers"
        subtitle="Curated savings for the trade. Join to unlock the full catalogue."
      />

      {fetchErr && (
        <div className="mb-4 rounded border border-red-600/40 bg-red-900/10 px-3 py-2 text-red-300 text-sm">
          {fetchErr}
        </div>
      )}

      {loading ? (
        <div className="grid gap-3 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-28 rounded-xl border border-neutral-800 bg-neutral-900 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-3">
          {items.length === 0 ? (
            <div className="col-span-full text-sm text-neutral-400">
              No offers available right now. Please check back soon.
            </div>
          ) : (
            items.map((o) => <OfferCard key={o.id} offer={o} onRedeem={() => redeem(o)} />)
          )}
        </div>
      )}

      {/* Unified join/upgrade modal */}
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