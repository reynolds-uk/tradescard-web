"use client";

import Link from "next/link";
import { useMe } from "@/lib/useMe";
import { TRIAL_COPY, shouldShowTrial } from "@/lib/trial";
import { useJoinModal } from "./JoinModalContext";

export default function Nav() {
  const me = useMe();
  const { open: openJoin } = useJoinModal();

  return (
    <nav className="sticky top-0 z-40 border-b border-neutral-900/60 bg-neutral-950/80 backdrop-blur">
      <div className="mx-auto max-w-5xl px-4 h-12 flex items-center justify-between">
        <Link href="/" className="font-semibold">TradesCard</Link>

        <div className="flex items-center gap-4 text-sm">
          <Link href="/offers">Offers</Link>
          <Link href="/benefits">Benefits</Link>
          <Link href="/rewards">Rewards</Link>

          {/* Right side: account / join */}
          {!me.ready ? (
            <div className="opacity-60">…</div>
          ) : me.user ? (
            <div className="flex items-center gap-2">
              {me.tier !== "pro" && me.status !== "canceled" ? (
                <button
                  onClick={() => openJoin("pro")}
                  className="rounded bg-neutral-900 px-3 py-1 hover:bg-neutral-800"
                  title={`You're ${me.tier}. Upgrade to Pro.`}
                >
                  {me.tier.toUpperCase()}
                </button>
              ) : (
                <span className="rounded bg-neutral-900 px-3 py-1">{me.tier.toUpperCase()}</span>
              )}
              <Link
                href="/account"
                className="rounded bg-amber-400 text-black px-3 py-1 font-medium hover:opacity-90"
              >
                Account
              </Link>
            </div>
          ) : (
            <button
              onClick={() => openJoin("member")}
              className="rounded bg-amber-400 text-black px-3 py-1 font-medium hover:opacity-90"
            >
              Sign in / Join
            </button>
          )}
        </div>
      </div>

      {/* Trial ribbon (only to non-members) */}
      {shouldShowTrial(me) && (
        <div className="hidden md:flex justify-end px-4 pb-2">
          <button
            onClick={() => openJoin("member")}
            className="rounded bg-amber-400/10 text-amber-200 border border-amber-400/30 px-3 py-1 text-xs"
          >
            {TRIAL_COPY}
          </button>
        </div>
      )}
    </nav>
  );
}