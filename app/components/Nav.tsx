"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useMe } from "@/lib/useMe";
import { shouldShowTrial, TRIAL_COPY } from "@/lib/trial";
import { routeToJoin } from "@/lib/routeToJoin";

export default function Nav() {
  const me = useMe(); // { user, tier, status }
  const signedIn = !!me?.user;
  const tier = (me?.tier as "access" | "member" | "pro") ?? "access";
  const status = me?.status ?? "free";
  const canUpgrade = signedIn && tier !== "pro";
  const trial = shouldShowTrial(me);

  // Light labels
  const tierBadge = useMemo(() => {
    if (!signedIn) return null;
    const tone =
      tier === "pro" ? "bg-amber-900/30 text-amber-200"
      : tier === "member" ? "bg-green-900/30 text-green-300"
      : "bg-neutral-800 text-neutral-300";
    return <span className={`rounded px-2 py-0.5 text-[11px] ${tone}`}>{tier.toUpperCase()}</span>;
  }, [signedIn, tier]);

  return (
    <nav className="sticky top-0 z-40 border-b border-neutral-900/60 bg-neutral-950/80 backdrop-blur supports-[backdrop-filter]:bg-neutral-950/60">
      <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
        {/* Brand */}
        <Link href="/" className="font-semibold">TradesCard</Link>

        {/* Primary */}
        <div className="ml-2 flex items-center gap-3 text-sm">
          <Link href="/offers" className="hover:opacity-90">Offers</Link>
          <Link href="/benefits" className="hover:opacity-90">Benefits</Link>
          <Link href="/rewards" className="hover:opacity-90">Rewards</Link>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Trial chip (soft nudge, paid-focused) */}
          {trial && (
            <button
              onClick={() => routeToJoin("member")}
              className="promo-chip hidden sm:inline"
              title="Limited-time offer"
            >
              {TRIAL_COPY}
            </button>
          )}

          {/* Right-hand actions */}
          {signedIn ? (
            <>
              {tierBadge}
              {(status === "active" || status === "trialing") && (
                <span className="rounded px-2 py-0.5 text-[11px] bg-neutral-800 text-neutral-300">
                  {status}
                </span>
              )}
              {canUpgrade && (
                <button
                  onClick={() => routeToJoin(tier === "member" ? "pro" : "member")}
                  className="rounded-lg bg-white text-black text-sm px-3 py-1.5 hover:bg-neutral-200"
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
              <Link
                href="/join?mode=signin"
                className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-sm hover:bg-neutral-800"
              >
                Sign in
              </Link>
              <Link
                href="/join"
                className="rounded-lg bg-white text-black text-sm px-3 py-1.5 hover:bg-neutral-200"
              >
                Join
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}