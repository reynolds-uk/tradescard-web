// app/components/Nav.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useMe } from "@/lib/useMe";
import { shouldShowTrial, TRIAL_COPY } from "@/lib/trial";
import { routeToJoin } from "@/lib/routeToJoin";

export default function Nav() {
  const me = useMe();
  const signedIn = !!me?.user;
  const tier = (me?.tier as "access" | "member" | "pro") ?? "access";
  const status = me?.status ?? "free";
  const canUpgrade = signedIn && tier !== "pro";
  const trial = shouldShowTrial(me);

  const [menuOpen, setMenuOpen] = useState(false);
  const [showScrollCta, setShowScrollCta] = useState(false);

  // lock scroll when menu open
  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  // show sticky mobile CTA after scroll
  useEffect(() => {
    const onScroll = () => setShowScrollCta(window.scrollY > 180);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const tierBadge = useMemo(() => {
    if (!signedIn) return null;
    const tone =
      tier === "pro"
        ? "bg-amber-900/30 text-amber-200"
        : tier === "member"
        ? "bg-green-900/30 text-green-300"
        : "bg-neutral-800 text-neutral-300";
    return (
      <span className={`rounded px-2 py-0.5 text-[11px] ${tone}`} aria-label={`Tier ${tier}`}>
        {tier.toUpperCase()}
      </span>
    );
  }, [signedIn, tier]);

  const SignInLink = (
    <Link
      href="/join?mode=signin"
      className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-sm hover:bg-neutral-800"
      onClick={() => setMenuOpen(false)}
    >
      Sign in
    </Link>
  );

  const JoinButton = (
    <button
      onClick={() => {
        setMenuOpen(false);
        routeToJoin("member");
      }}
      className="rounded-lg bg-white px-3 py-1.5 text-sm text-black hover:bg-neutral-200"
    >
      Join
    </button>
  );

  return (
    <>
      {/* Top nav (glass) */}
      <nav className="sticky top-0 z-40 border-b border-neutral-900/60 bg-neutral-950/80 backdrop-blur supports-[backdrop-filter]:bg-neutral-950/60">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          {/* Marketing-style brand */}
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold tracking-tight"
            onClick={() => setMenuOpen(false)}
            aria-label="tradecard home"
          >
            <span
              className="inline-block h-7 w-7 rounded-lg"
              style={{ background: "linear-gradient(135deg,#FD5A24,#ff7c43)" }}
            />
            <span className="font-extrabold lowercase">tradecard</span>
          </Link>

          {/* Desktop links */}
          <div className="ml-3 hidden items-center gap-4 text-sm md:flex">
            <Link href="/offers" className="hover:opacity-90">Offers</Link>
            <Link href="/benefits" className="hover:opacity-90">Benefits</Link>
            <Link href="/rewards" className="hover:opacity-90">Rewards</Link>
          </div>

          {/* Right actions (desktop) */}
          <div className="ml-auto hidden items-center gap-2 md:flex">
            {/* Desktop “Get your free card” (routes to free join) */}
            {!signedIn && (
              <Link
                href="/join?free=1"
                className="rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-sm hover:bg-neutral-800"
                title="Get your free card"
              >
                Get your free card
              </Link>
            )}

            {trial && (
              <button
                onClick={() => routeToJoin("member")}
                className="promo-chip"
                title="Limited-time offer"
              >
                {TRIAL_COPY}
              </button>
            )}

            {signedIn ? (
              <>
                {tierBadge}
                {(status === "active" || status === "trialing") && (
                  <span className="rounded bg-neutral-800 px-2 py-0.5 text-[11px] text-neutral-300">
                    {status}
                  </span>
                )}
                {canUpgrade && (
                  <button
                    onClick={() => routeToJoin(tier === "member" ? "pro" : "member")}
                    className="rounded-lg bg-white px-3 py-1.5 text-sm text-black hover:bg-neutral-200"
                  >
                    {tier === "member" ? "Upgrade" : "Join"}
                  </button>
                )}
                <Link
                  href="/account"
                  className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-sm hover:bg-neutral-800"
                >
                  Account
                </Link>
              </>
            ) : (
              <>
                {SignInLink}
                {JoinButton}
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            aria-label="Open menu"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen((v) => !v)}
            className="ml-auto inline-flex items-center rounded-lg border border-neutral-800 bg-neutral-900 p-2 text-neutral-200 hover:bg-neutral-800 md:hidden"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.6" />
            </svg>
          </button>
        </div>

        {/* Mobile drawer */}
        <div id="mobile-menu" className={`md:hidden ${menuOpen ? "pointer-events-auto" : "pointer-events-none"}`}>
          <div
            className={`fixed inset-0 z-40 bg-black/40 transition-opacity ${menuOpen ? "opacity-100" : "opacity-0"}`}
            onClick={() => setMenuOpen(false)}
          />
          <div
            className={`fixed inset-y-0 right-0 z-50 w-[85%] max-w-xs transform bg-neutral-950 p-4 ring-1 ring-neutral-900 transition-transform ${menuOpen ? "translate-x-0" : "translate-x-full"}`}
          >
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-7 w-7 rounded-lg"
                  style={{ background: "linear-gradient(135deg,#FD5A24,#ff7c43)" }}
                />
                <span className="font-extrabold lowercase">tradecard</span>
              </div>
              <button
                aria-label="Close menu"
                onClick={() => setMenuOpen(false)}
                className="rounded-lg border border-neutral-800 bg-neutral-900 p-2 hover:bg-neutral-800"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.6" />
                </svg>
              </button>
            </div>

            {!signedIn && (
              <Link
                href="/join?free=1"
                onClick={() => setMenuOpen(false)}
                className="mb-3 block rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm hover:bg-neutral-800"
              >
                Get your free card
              </Link>
            )}

            {trial && (
              <button
                onClick={() => {
                  setMenuOpen(false);
                  routeToJoin("member");
                }}
                className="promo-chip mb-3"
              >
                {TRIAL_COPY}
              </button>
            )}

            <nav className="grid gap-2 text-sm">
              <Link href="/offers" onClick={() => setMenuOpen(false)} className="rounded-lg px-2 py-2 hover:bg-neutral-900">Offers</Link>
              <Link href="/benefits" onClick={() => setMenuOpen(false)} className="rounded-lg px-2 py-2 hover:bg-neutral-900">Benefits</Link>
              <Link href="/rewards" onClick={() => setMenuOpen(false)} className="rounded-lg px-2 py-2 hover:bg-neutral-900">Rewards</Link>
            </nav>

            <div className="mt-4 h-px w-full bg-neutral-900" />

            <div className="mt-3 grid gap-2">
              {signedIn ? (
                <>
                  <div className="flex items-center gap-2 text-xs text-neutral-400">
                    {tierBadge}
                    {(status === "active" || status === "trialing") && (
                      <span className="rounded bg-neutral-800 px-2 py-0.5 text-[11px] text-neutral-300">
                        {status}
                      </span>
                    )}
                  </div>

                  {canUpgrade && (
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        routeToJoin(tier === "member" ? "pro" : "member");
                      }}
                      className="rounded-lg bg-white px-3 py-2 text-sm text-black hover:bg-neutral-200"
                    >
                      {tier === "member" ? "Upgrade" : "Join"}
                    </button>
                  )}

                  <Link
                    href="/account"
                    onClick={() => setMenuOpen(false)}
                    className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm hover:bg-neutral-800"
                  >
                    Account
                  </Link>
                </>
              ) : (
                <>
                  {SignInLink}
                  {JoinButton}
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Sticky mobile CTA */}
      <div
        className={`fixed inset-x-0 bottom-3 z-40 mx-auto w-full max-w-md px-3 transition-all duration-200 md:hidden ${showScrollCta ? "opacity-100" : "pointer-events-none opacity-0"}`}
      >
        <div className="flex items-center gap-2 rounded-2xl border border-neutral-800 bg-neutral-950/90 p-2 shadow-lg backdrop-blur">
          <Link
            href="/join?free=1"
            className="flex-1 rounded-xl bg-white px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200 text-center"
          >
            Get your free card
          </Link>
          <Link
            href="/join?mode=signin"
            className="rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm text-neutral-100 hover:bg-neutral-800"
          >
            Sign in
          </Link>
        </div>
      </div>
    </>
  );
}