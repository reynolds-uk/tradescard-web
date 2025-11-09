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
type NudgeSource = "banner" | "sticky" | "card" | "empty" | "teaser";

type OfferWithExtras = Offer & {
  merchant?: string | null;
  brand?: string | null;
};

export default function OffersPage() {
  // Auth / membership
  const me = useMe();
  const ready = useMeReady();
  const tier: Tier = (me?.tier as Tier) ?? "access";
  const isLoggedIn = !!me?.user;
  const isPaidTier = tier === "member" || tier === "pro";
  const isActivePaid =
    isPaidTier && (me?.status === "active" || me?.status === "trialing");
  const showTrial = shouldShowTrial(me);

  // Where to bounce back after checkout/auth
  const next = "/offers";
  const { busy, error: checkoutErr } = useJoinActions(next);

  // Data
  const [items, setItems] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchErr, setFetchErr] = useState<string>("");

  // UX: search + category filter
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<string>("All");

  // Fetch offers
  useEffect(() => {
    if (!ready) return;
    const ctrl = new AbortController();

    (async () => {
      try {
        setLoading(true);
        setFetchErr("");

        const url = isActivePaid
          ? `${API_BASE}/api/offers`
          : `${API_BASE}/api/offers?visibility=access`;

        const res = await fetch(url, {
          cache: "no-store",
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error(`Failed to load offers (${res.status})`);

        const data = (await res.json()) as unknown;
        setItems(Array.isArray(data) ? (data as Offer[]) : []);
      } catch (e) {
        if (ctrl.signal.aborted) return;
        setFetchErr(
          e instanceof Error
            ? e.message
            : "Couldn’t load offers. Please try again."
        );
        setItems([]);
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    })();

    return () => ctrl.abort();
  }, [ready, isActivePaid]);

  // Redemption rules
  const canRedeem = isLoggedIn;

  const handleUnlockPaid = (source: NudgeSource) => {
    track("offers_nudge_upgrade_click", { trial: showTrial, source });
    routeToJoin("member");
  };

  const handleJoinFree = (source: NudgeSource) => {
    track("offers_nudge_join_free_click", { source });
    routeToJoin();
  };

  const redeem = (o: Offer) => {
    if (!canRedeem) {
      handleJoinFree("card");
      return;
    }
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

  // Category list (auto from feed)
  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((o) => o.category && set.add(o.category));
    return ["All", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [items]);

  // Apply filters (search title + optional brand/merchant + category)
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((o) => {
      const ox = o as OfferWithExtras;
      const catOk = cat === "All" || (o.category || "") === cat;
      if (!q) return catOk;
      const hay = `${o.title ?? ""} ${
        ox.merchant ?? ox.brand ?? ""
      } ${o.category ?? ""}`.toLowerCase();
      return catOk && hay.includes(q);
    });
  }, [items, cat, query]);

  // Sticky mobile CTA
  const showSticky = ready && !isActivePaid;
  const stickyIsVisitor = showSticky && !isLoggedIn;

  // Interleave a member teaser every N cards for visitors/free
  const withTeasers = useMemo(() => {
    if (isActivePaid) return filtered.map((o) => ({ type: "offer", o }) as const);
    const out: Array<{ type: "offer"; o: Offer } | { type: "teaser"; key: string }> = [];
    filtered.forEach((o, i) => {
      out.push({ type: "offer", o });
      if ((i + 1) % 4 === 0) {
        out.push({ type: "teaser", key: `teaser-${i}` });
      }
    });
    return out;
  }, [filtered, isActivePaid]);

  return (
    <>
      {/* Sticky CTA (mobile) */}
      {showSticky && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-800 bg-neutral-950/95 backdrop-blur supports-[backdrop-filter]:bg-neutral-950/70 md:hidden"
             style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0px)" }}>
          <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between gap-2">
            <div className="text-xs text-neutral-300">
              {stickyIsVisitor
                ? "Join free to redeem"
                : "Upgrade to unlock more offers"}
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
                {showTrial
                  ? TRIAL_COPY
                  : stickyIsVisitor
                  ? "Try Member"
                  : "Unlock more"}
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}

      <Container className="pb-24 md:pb-10">
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

        {/* Context card for visitors/free users */}
        {!isActivePaid && ready && (
          <div
            className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-neutral-800 bg-neutral-900/60 p-4"
            role="region"
            aria-label="Membership context"
          >
            <div className="text-sm text-neutral-300">
              <div className="font-medium text-neutral-100">
                You’re browsing the public view
              </div>
              <ul className="mt-1 list-disc pl-5 space-y-1">
                <li>Join free to redeem today’s deals</li>
                <li>Upgrade for member-only offers & monthly rewards</li>
                <li>Cancel anytime — no nonsense</li>
              </ul>
            </div>
            <div className="flex shrink-0 gap-2">
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

        {/* Top controls: category chips + search */}
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                  cat === c
                    ? "border-neutral-700 bg-neutral-800"
                    : "border-neutral-800 bg-neutral-900 hover:bg-neutral-800"
                }`}
                aria-pressed={cat === c}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="flex items-center">
            <input
              type="search"
              placeholder="Search offers…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full sm:w-72 rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-600"
              aria-label="Search offers"
            />
          </div>
        </div>

        {/* Errors */}
        {fetchErr && (
          <div
            className="mb-4 rounded border border-red-600/40 bg-red-900/10 px-3 py-2 text-red-300 text-sm"
            role="alert"
          >
            {fetchErr}
          </div>
        )}
        {checkoutErr && (
          <div
            className="mb-4 rounded border border-red-600/40 bg-red-900/10 px-3 py-2 text-red-300 text-sm"
            role="alert"
          >
            {checkoutErr}
          </div>
        )}

        {/* Catalogue */}
        {!ready || loading ? (
          <div className="grid gap-3 md:grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className="h-28 rounded-xl border border-neutral-800 bg-neutral-900 animate-pulse"
              />
            ))}
          </div>
        ) : withTeasers.length === 0 ? (
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-6 text-sm text-neutral-300">
            No offers match your filters.
            {!isActivePaid && (
              <div className="mt-3 flex flex-wrap gap-2">
                {!isLoggedIn && (
                  <button
                    onClick={() => handleJoinFree("empty")}
                    className="rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm hover:bg-neutral-800"
                  >
                    Join free
                  </button>
                )}
                <PrimaryButton
                  onClick={() => handleUnlockPaid("empty")}
                  disabled={busy}
                  className="px-3 py-1.5"
                >
                  {showTrial ? TRIAL_COPY : isLoggedIn ? "Unlock more" : "Try Member"}
                </PrimaryButton>
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            {withTeasers.map((row) =>
              row.type === "offer" ? (
                <OfferCard
                  key={row.o.id}
                  offer={row.o}
                  onRedeem={() => redeem(row.o)}
                  userTier={tier}
                  activePaid={isActivePaid}
                  ctaLabel={
                    !isLoggedIn
                      ? showTrial
                        ? TRIAL_COPY
                        : "Join free to redeem"
                      : undefined
                  }
                />
              ) : (
                // Member teaser card (for visitors/free users)
                <div
                  key={row.key}
                  className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 flex flex-col justify-between"
                  role="complementary"
                  aria-label="Members get more"
                >
                  <div>
                    <div className="text-sm font-medium text-neutral-100">
                      More for Members
                    </div>
                    <p className="mt-1 text-sm text-neutral-300">
                      Unlock member-only offers, early access and monthly rewards.
                    </p>
                  </div>
                  <div className="mt-3 flex gap-2">
                    {!isLoggedIn && (
                      <button
                        onClick={() => handleJoinFree("teaser")}
                        className="rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm hover:bg-neutral-800"
                      >
                        Join free
                      </button>
                    )}
                    <PrimaryButton
                      onClick={() => handleUnlockPaid("teaser")}
                      disabled={busy}
                      className="px-3 py-1.5"
                    >
                      {showTrial ? TRIAL_COPY : isLoggedIn ? "Unlock more" : "Try Member"}
                    </PrimaryButton>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </Container>
    </>
  );
}