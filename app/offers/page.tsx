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
type NudgeSource = "banner" | "sticky" | "card";

export default function OffersPage() {
  // Auth/membership
  const me = useMe();                   // { user, tier, status }
  const ready = useMeReady();           // avoid auth flash
  const tier: Tier = (me?.tier as Tier) ?? "access";
  const isLoggedIn = !!me?.user;
  const isPaidTier = tier === "member" || tier === "pro";
  const isActivePaid =
    isPaidTier && (me?.status === "active" || me?.status === "trialing");
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

        // Paid = full catalogue; everyone else = access/teaser
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

  // Redemption rules:
  // - Visitor (not logged in): prompt to Join Free (create Access account)
  // - Access (logged in): CAN redeem displayed offers; sees upgrade nudges to get more offers
  // - Paid: CAN redeem all displayed offers
  const canRedeem = isLoggedIn;

  const handleUnlockPaid = (source: NudgeSource) => {
    track("offers_nudge_upgrade_click", { trial: showTrial, source });
    routeToJoin("member");
  };

  const handleJoinFree = (source: NudgeSource) => {
    track("offers_nudge_join_free_click", { source });
    routeToJoin(); // Access flow
  };

  const redeem = (o: Offer) => {
    if (!canRedeem) {
      // Visitor → prompt to create a free Access account
      handleJoinFree("card");
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
      return "You can redeem these now. Upgrade to unlock the full catalogue.";
    return "See what’s on. Join free to redeem, upgrade to unlock more.";
  }, [ready, isActivePaid, isLoggedIn]);

  const showSkeleton = !ready || loading;

  // Sticky mobile CTA logic:
  // - Visitor: Join free + Try Member
  // - Access: Upgrade to unlock more (no Join free)
  // - Paid: none
  const showSticky = ready && !isActivePaid;
  const stickyIsVisitor = showSticky && !isLoggedIn;

  return (
    <>
      {showSticky && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-800 bg-neutral-950/95 backdrop-blur supports-[backdrop-filter]:bg-neutral-950/70 md:hidden">
          <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between gap-2">
            <div className="text-xs text-neutral-300">
              {stickyIsVisitor ? "Join free to redeem" : "Upgrade to unlock more offers"}
            </div>
            <div className="flex items-center gap-2">
              {stickyIsVisitor && (
                <button
                  onClick={() => handleJoinFree("sticky")}
                  className="rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-xs font-medium hover:bg-neutral-800"
                >
                  Join free
                </button>
              )}
              <PrimaryButton
                onClick={() => handleUnlockPaid("sticky")}
                disabled={busy}
                className="text-xs px-3 py-1.5"
              >
                {showTrial ? TRIAL_COPY : stickyIsVisitor ? "Try Member" : "Unlock more"}
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
            showTrial && !isActivePaid ? (
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

        {/* Upgrade/Join nudge (desktop) */}
        {!isActivePaid && ready && (
          <div className="mb-4 hidden md:flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
            <div className="text-sm text-neutral-300">
              {isLoggedIn
                ? "Upgrade to unlock the full catalogue."
                : "Join free to redeem, then upgrade for more."}
            </div>
            <div className="flex gap-2">
              {!isLoggedIn && (
                <button
                  onClick={() => handleJoinFree("banner")}
                  className="rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm hover:bg-neutral-800"
                >
                  Join free
                </button>
              )}
              <PrimaryButton
                onClick={() => handleUnlockPaid("banner")}
                disabled={busy}
                className="px-3 py-1.5"
              >
                {showTrial ? TRIAL_COPY : isLoggedIn ? "Unlock more" : "Try Member"}
              </PrimaryButton>
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
                  userTier={tier}                 // paid users won't see "PUBLIC" badge
                  activePaid={isActivePaid}       // card can hide lock/teaser for paid
                  // CTA for *visitors only*. Access users can redeem directly.
                  ctaLabel={
                    !isLoggedIn
                      ? showTrial
                        ? TRIAL_COPY
                        : "Join free to redeem"
                      : undefined
                  }
                />
              ))
            )}
          </div>
        )}
      </Container>
    </>
  );
}