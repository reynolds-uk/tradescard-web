// app/components/Nav.tsx
"use client";

import Link from "next/link";
import PrimaryButton from "@/components/PrimaryButton";
import { useMe } from "@/lib/useMe";
import { shouldShowTrial, TRIAL_COPY } from "@/lib/trial";
import { routeToJoin } from "@/lib/routeToJoin";

export default function Nav() {
  const me = useMe(); // { user, email?, tier, status, ready }
  const isLoggedIn = !!me?.user;
  const showTrialChip = shouldShowTrial(me);

  return (
    <nav className="sticky top-0 z-40 border-b border-neutral-900 bg-neutral-950/80 backdrop-blur supports-[backdrop-filter]:bg-neutral-950/60">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        {/* Left: brand + sections */}
        <div className="flex items-center gap-4">
          <Link href="/offers" className="font-semibold">
            TradesCard
          </Link>
          <Link href="/offers" className="text-sm text-neutral-300 hover:text-white">
            Offers
          </Link>
          <Link href="/benefits" className="text-sm text-neutral-300 hover:text-white">
            Benefits
          </Link>
          <Link href="/rewards" className="text-sm text-neutral-300 hover:text-white">
            Rewards
          </Link>

          {showTrialChip && (
            <span className="hidden sm:inline rounded border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-xs text-amber-200">
              {TRIAL_COPY}
            </span>
          )}
        </div>

        {/* Right: session actions */}
        <div className="flex items-center gap-2">
          {isLoggedIn ? (
            <>
              {/* Upgrade visible unless already Pro or cancelled */}
              {me?.tier !== "pro" && me?.status !== "canceled" && (
                <PrimaryButton
                  onClick={() => routeToJoin("pro")}
                  title={`You're ${me?.tier}. Upgrade to Pro.`}
                >
                  Upgrade to Pro
                </PrimaryButton>
              )}

              <Link
                href="/account"
                title={me?.email ? `Signed in as ${me.email}` : "Account"}
                className="rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm font-medium hover:bg-neutral-800"
              >
                Account
              </Link>
            </>
          ) : (
            <PrimaryButton onClick={() => routeToJoin()}>
              Sign in / Join
            </PrimaryButton>
          )}
        </div>
      </div>
    </nav>
  );
}