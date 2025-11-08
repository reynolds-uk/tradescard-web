// app/components/Nav.tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { useMe } from "@/lib/useMe";
import { TRIAL_ACTIVE, TRIAL_COPY } from "@/lib/trial";

export default function Nav() {
  const pathname = usePathname();
  const me = useMe() as any;

  const showTrialChip = useMemo(() => {
    if (!TRIAL_ACTIVE) return false;
    if (!me) return true;
    return !(me.status === "active" && (me.tier === "member" || me.tier === "pro"));
  }, [me]);

  const onSignInJoin = () => {
    if (pathname === "/join") {
      // scroll to the free input
      const el = document.querySelector("#join-free") as HTMLElement | null;
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    window.location.href = "/join#free";
  };

  return (
    <nav className="sticky top-0 z-40 border-b border-neutral-900 bg-neutral-950/80 backdrop-blur supports-[backdrop-filter]:bg-neutral-950/60">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-4">
          <Link href="/" className="font-semibold">TradesCard</Link>
          <Link href="/offers" className="text-sm text-neutral-300 hover:text-white">Offers</Link>
          <Link href="/benefits" className="text-sm text-neutral-300 hover:text-white">Benefits</Link>
          <Link href="/rewards" className="text-sm text-neutral-300 hover:text-white">Rewards</Link>

          {showTrialChip && (
            <span className="hidden sm:inline rounded border border-brand/30 bg-brand/10 px-2 py-0.5 text-xs text-brand">
              {TRIAL_COPY}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {me?.email ? (
            <>
              {me.tier !== "pro" && me.status !== "canceled" && (
                <button
                  onClick={() => (window.location.href = "/account#upgrade")}
                  className="btn-brand"
                >
                  Upgrade
                </button>
              )}
              <Link href="/account" className="btn-brand">Account</Link>
            </>
          ) : (
            <button onClick={onSignInJoin} className="btn-brand">
              Sign in / Join
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}