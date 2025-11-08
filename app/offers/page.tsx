// app/offers/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import PrimaryButton from "@/components/PrimaryButton";
import { OfferCard, type Offer } from "@/components/OfferCard";
import { useJoinActions } from "@/components/useJoinActions";
import { useMe } from "@/lib/useMe";
import { useMeReady } from "@/lib/useMeReady";
import { routeToJoin } from "@/lib/routeToJoin";
import { shouldShowTrial, TRIAL_COPY } from "@/lib/trial";
import { track } from "@/lib/track";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://tradescard-api.vercel.app";

type Tier = "access" | "member" | "pro";

export default function OffersPage() {
  // Auth/membership
  const me = useMe(); // { user, tier, status }
  const ready = useMeReady(); // prevent logged-out ➜ in flicker
  const tier: Tier = (me?.tier as Tier) ?? "access";
  const isPaidTier = tier === "member" || tier === "pro";
  const isActivePaid =
    isPaidTier && (me?.status === "active" || me?.status === "trialing");
  const isLoggedIn = !!me?.user;
  const showTrial = shouldShowTrial(me);

  // Where to bounce back after checkout/auth
  const next = "/offers";
  const { busy, error } = useJoinActions(next);

  // Offers list
  const [items, setItems] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchErr, setFetchErr] = useState<string>("");

  useEffect(() => {
    let aborted = false;
    if (!ready) return;

    (async () => {
      try {
        setLoading(true);
        setFetchErr("");

        // Paid gets all offers; others see public teaser
        const url = isActivePaid
          ? `${API_BASE}/api/offers`
          : `${API_BASE}/api/offers?visibility=access`;

        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`Offers failed: ${res.status}`);

        const data = (await res.json()) as unknown;
        if (!aborted) setItems(Array.isArray(data) ? (data as Offer[]) : []);
      } catch (e) {
        if (!aborted) {
          setFetchErr(
            e instanceof Error
              ? e.message
              : "Failed to load offers. Please try again."
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
  }, [ready, isActivePaid]);

  const unlockClick = (source: "banner" | "card" | "sticky") => {
    track("offers_nudge_upgrade_click", { trial: showTrial, source });
    routeToJoin("member");
  };

  const joinFreeClick = (source: "banner" | "sticky") => {
    track("offers_nudge_join_free_click", { source });
    routeToJoin(); // Access flow
  };

  const redeem = (o: Offer) => {
    if (!isActivePaid) {
      unlockClick("card");
      return;
    }
    // Track then open
    fetch(`${API_BASE}/api/redemptions/click`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offer_id: o.id }),
      keepalive: true,
    }).catch(() => {});
    track("offer_click", { offer_id: o.id, category: o.category, tier });
    if (o.link) window.open(o.link, "_blank", "noopener,noreferrer");
  };

  // Subtitle per state
  const subtitle = useMemo(() => {
    if (!ready) return "Loading your offers…";
    if (isActivePaid) return "All your member deals in one place.";
    if (isLoggedIn)
      return "Browse the catalogue. Unlock member-only redemptions when you upgrade.";
    return "A taste of the savings available. Join free or pick a plan to unlock full access.";
  }, [ready, isActivePaid, isLoggedIn]);

  const showSkeleton = !ready || loading;

  return (
    <>
      {/* Sticky mobile CTA (only when not eligible and auth is ready) */}
      {!isActivePaid && ready && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-800 bg-neutral-950/95 backdrop-blur supports-[backdrop-filter]:bg-neutral-950/70 md:hidden">
          <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between gap-2">
            <div className="text-xs text-neutral-300">
              Unlock member-only redemptions
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => joinFreeClick("sticky")}
                className="rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-xs font-medium hover:bg-neutral-800"
              >
                Join free
              </button>
              <PrimaryButton
                onClick={() => unlockClick("sticky")}
                disabled={busy}
                className="text-xs px-3 py-1.5"
              >
                {showTrial ? TRIAL_COPY : "Unlock access"}
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}

      <Container className="pb-20 md:pb-10">
        <PageHeader
          title="Offers"
          subtitle={subtitle}
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
        {error && (
          <div className="mb-4 rounded border border-red-600/40 bg-red-900/10 px-3 py-2 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Upgrade nudge (only when not eligible and ready) */}
        {!isActivePaid && ready && (
          <div className="mb-4 rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-neutral-300">
                Sign in and upgrade to unlock member-only redemptions.
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => joinFreeClick("banner")}
                  className="rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm hover:bg-neutral-800"
                >
                  Join free
                </button>
                <PrimaryButton
                  onClick={() => unlockClick("banner")}
                  disabled={busy}
                  className="px-3 py-1.5"
                >
                  {showTrial ? TRIAL_COPY : "Unlock full access"}
                </PrimaryButton>
              </div>
            </div>
          </div>
        )}

        {/* Catalogue */}
        {showSkeleton ? (
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
                  userTier={tier} // hide PUBLIC for paid users
                  activePaid={isActivePaid} // paid members never see teaser states
                  ctaLabel={
                    !isActivePaid
                      ? showTrial
                        ? TRIAL_COPY
                        : isLoggedIn
                        ? "Upgrade to redeem"
                        : "Join to redeem"
                      : undefined
                  }
                />
              ))
            )}
          </div>
        )}

        {/* Secondary nudge (desktop) */}
        {!isActivePaid && ready && (
          <div className="mt-6 hidden md:flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
            <div className="text-sm text-neutral-300">
              Ready to unlock the full catalogue?
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => joinFreeClick("banner")}
                className="rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm hover:bg-neutral-800"
              >
                Join free
              </button>
              <PrimaryButton
                onClick={() => unlockClick("banner")}
                disabled={busy}
                className="px-3 py-1.5"
              >
                {showTrial ? TRIAL_COPY : "Unlock access"}
              </PrimaryButton>
            </div>
          </div>
        )}
      </Container>
    </>
  );
}