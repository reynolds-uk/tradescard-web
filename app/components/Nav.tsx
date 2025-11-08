// app/components/Nav.tsx
"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useMe } from "@/lib/useMe";                // your central auth/me hook
import { useJoinModal } from "@/components/JoinModalContext";
import { TRIAL_ACTIVE, TRIAL_COPY } from "@/lib/trial"; // simple env helpers

export default function Nav() {
  const { me, loading } = useMe();
  const { openJoin } = useJoinModal(); // <- function, not boolean

  const showTrialChip = useMemo(() => {
    if (!TRIAL_ACTIVE) return false;
    if (!me) return true; // logged out still sees the chip
    return !(me.status === "active" && (me.tier === "member" || me.tier === "pro"));
  }, [me]);

  return (
    <nav className="sticky top-0 z-40 border-b border-neutral-900 bg-neutral-950/80 backdrop-blur supports-[backdrop-filter]:bg-neutral-950/60">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-4">
          <Link href="/" className="font-semibold">TradesCard</Link>
          <Link href="/offers" className="text-sm text-neutral-300 hover:text-white">Offers</Link>
          <Link href="/benefits" className="text-sm text-neutral-300 hover:text-white">Benefits</Link>
          <Link href="/rewards" className="text-sm text-neutral-300 hover:text-white">Rewards</Link>

          {showTrialChip && (
            <span className="hidden sm:inline rounded border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-xs text-amber-200">
              {TRIAL_COPY}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!loading && me ? (
            <>
              {me.tier !== "pro" && me.status !== "canceled" && (
                <button
                  onClick={() => openJoin("pro")}
                  className="rounded bg-neutral-900 px-3 py-1 text-sm hover:bg-neutral-800"
                  title={`You're ${me.tier}. Upgrade to Pro.`}
                >
                  Upgrade
                </button>
              )}
              <Link
                href="/account"
                className="rounded bg-amber-400 px-3 py-1 text-sm font-medium text-black hover:opacity-90"
                title={`Signed in as ${me.email}`}
              >
                Account
              </Link>
            </>
          ) : (
            <button
              onClick={() => openJoin("member")}
              className="rounded bg-amber-400 px-3 py-1 text-sm font-medium text-black hover:opacity-90"
            >
              Sign in / Join
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}