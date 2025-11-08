// app/offers/page.tsx
"use client";

import { useEffect, useState } from "react";
import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import { OfferCard, type Offer } from "@/components/OfferCard";
import JoinModal from "@/components/JoinModal";
import { useJoinActions } from "@/components/useJoinActions";
import { useMe } from "@/lib/useMe";
import { shouldShowTrial, TRIAL_COPY } from "@/lib/trial";
import { track } from "@/lib/track";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://tradescard-api.vercel.app";

type Tier = "access" | "member" | "pro";

export default function OffersPage() {
  // Auth/membership (single source of truth)
  const me = useMe(); // { tier, status } | null
  const tier: Tier = (me?.tier as Tier) ?? "access";
  const isActive = me?.status === "active" || me?.status === "trialing";
  const isEligible = isActive && (tier === "member" || tier === "pro");
  const showTrial = shouldShowTrial(me);

  // Where to bounce back after auth/checkout
  const next = typeof window !== "undefined" ? window.location.pathname : "/offers";
  const { busy, error, joinFree, startMembership } = useJoinActions(next);

  // Modal
  const [joinOpen, setJoinOpen] = useState(false);

  // Offers
  const [items, setItems] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchErr, setFetchErr] = useState<string>("");

  useEffect(() => {
    let aborted = false;
    (async () => {
      try {
        setLoading(true);
        setFetchErr("");

        // Public catalogue (redemption is gated)
        const res = await fetch(`${API_BASE}/api/offers?visibility=access`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`Offers failed: ${res.status}`);
        const data = (await res.json()) as unknown;

        if (!aborted) {
          setItems(Array.isArray(data) ? (data as Offer[]) : []);
        }
      } catch (e) {
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
  }, []);

  const redeem = (o: Offer) => {
    if (!isEligible) {
      setJoinOpen(true);
      return;
    }
    // Track and go
    fetch(`${API_BASE}/api/redemptions/click`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offer_id: o.id }),
      keepalive: true,
    }).catch(() => {});
    track("offer_click", { offer_id: o.id, category: o.category, tier });
    if (o.link) window.open(o.link, "_blank", "noopener,noreferrer");
  };

  return (
    <Container>
      <PageHeader
        title="Offers"
        subtitle="Curated savings for the trade. Join to unlock the full catalogue."
        aside={
          showTrial ? (
            <span className="hidden sm:inline rounded bg-amber-400/20 text-amber-200 text-xs px-2 py-1 border border-amber-400/30">
              {TRIAL_COPY}
            </span>
          ) : undefined
        }
      />

      {fetchErr && (
        <div className="mb-4 rounded border border-red-600/40 bg-red-900/10 px-3 py-2 text-red-300 text-sm">
          {fetchErr}
        </div>
      )}

      {/* Upgrade nudge for Access / inactive users */}
      {!isEligible && (
        <div className="mb-4 rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-neutral-300">
              Sign in and upgrade to unlock member-only redemptions.
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  track("offers_nudge_upgrade_click", { trial: showTrial });
                  setJoinOpen(true);
                }}
                className="rounded-lg bg-amber-400 text-black px-3 py-1.5 text-sm font-medium hover:opacity-90"
              >
                {showTrial ? TRIAL_COPY : "Unlock full access"}
              </button>
              <button
                onClick={() => {
                  track("offers_nudge_join_free_click");
                  setJoinOpen(true);
                }}
                className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm hover:bg-neutral-800"
              >
                Join free
              </button>
            </div>
          </div>
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
            items.map((o) => (
              <OfferCard
                key={o.id}
                offer={o}
                onRedeem={() => redeem(o)}
                disabled={!isEligible}
                ctaLabel={
                  !isEligible ? (showTrial ? TRIAL_COPY : "Join to redeem") : undefined
                }
              />
            ))
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