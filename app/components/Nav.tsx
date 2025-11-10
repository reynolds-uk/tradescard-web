"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useMe } from "@/lib/useMe";
import { useMeReady } from "@/lib/useMeReady";
import { routeToJoin } from "@/lib/routeToJoin";

type Tier = "access" | "member" | "pro";
type AppStatus = "free" | "trial" | "paid" | "inactive";
const isActiveStatus = (s?: string) => s === "paid" || s === "trial";

export default function Nav() {
  const router = useRouter();
  const pathname = usePathname();

  const ready = useMeReady();
  const me = useMe(); // { user, tier, status }

  const signedIn = !!me?.user;
  const tier: Tier = (me?.tier as Tier) ?? "access";
  const status: AppStatus = (me?.status as AppStatus) ?? "free";
  const activePaid = (tier === "member" || tier === "pro") && isActiveStatus(status);
  const canUpgrade = signedIn && tier !== "pro";

  const onJoinPage = pathname?.startsWith("/join") ?? false;
  const primaryCtaLabel = "Join";

  // Active link styling
  const isActive = (href: string) => (pathname === href ? "text-white" : "hover:opacity-90");

  // Tier badge (only when signed in)
  const tierBadge = useMemo(() => {
    if (!signedIn) return null;
    const tone =
      tier === "pro"
        ? "bg-amber-900/30 text-amber-200"
        : tier === "member"
        ? "bg-green-900/30 text-green-300"
        : "bg-neutral-800 text-neutral-300";
    return (
      <span className={`rounded px-2 py-0.5 text-[11px] ${tone}`}>
        {tier.toUpperCase()}
      </span>
    );
  }, [signedIn, tier]);

  // Mobile menu
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const to = (href: string) => {
    close();
    router.push(href);
  };

  return (
    <nav className="sticky top-0 z-40 border-b border-neutral-900/60 bg-neutral-950/80 backdrop-blur supports-[backdrop-filter]:bg-neutral-950/60">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
        {/* Left: brand + mobile burger */}
        <button
          className="mr-1 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-300 hover:bg-neutral-800 sm:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            {!open ? (
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            ) : (
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            )}
          </svg>
        </button>

        <Link href="/" className="flex items-center gap-2 font-semibold lowercase">
          <span
            aria-hidden
            className="h-5 w-5 rounded-md"
            style={{ background: "linear-gradient(135deg,#FD5A24,#ff7c43)" }}
          />
          <span>tradecard</span>
        </Link>

        {/* Desktop primary links */}
        <div className="ml-2 hidden items-center gap-3 text-sm sm:flex">
          <Link href="/offers" className={isActive("/offers")}>
            Offers
          </Link>
          <Link href="/benefits" className={isActive("/benefits")}>
            Benefits
          </Link>
          <Link href="/rewards" className={isActive("/rewards")}>
            Rewards
          </Link>
        </div>

        {/* Right-hand actions */}
        <div className="ml-auto hidden items-center gap-2 sm:flex">
          {/* While auth is resolving, keep things calm (avoid flicker) */}
          {!ready ? (
            <>
              <div className="h-6 w-16 rounded bg-neutral-800 animate-pulse" />
              <div className="h-8 w-20 rounded bg-neutral-800 animate-pulse" />
            </>
          ) : signedIn ? (
            <>
              {tierBadge}
              {activePaid && (
                <span className="rounded px-2 py-0.5 text-[11px] bg-neutral-800 text-neutral-300">
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
              <Link
                href="/join?mode=signin"
                className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-sm hover:bg-neutral-800"
              >
                Sign in
              </Link>
              {!onJoinPage && (
                <Link
                  href="/join"
                  className="rounded-lg bg-white px-3 py-1.5 text-sm text-black hover:bg-neutral-200"
                >
                  {primaryCtaLabel}
                </Link>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mobile sheet (opaque, not transparent) */}
      <div
        className={[
          "sm:hidden fixed inset-x-0 top-[56px] transition-transform duration-200",
          open ? "translate-y-0" : "-translate-y-[150%]",
          "bg-neutral-950",
          "supports-[backdrop-filter]:bg-neutral-950/90 supports-[backdrop-filter]:backdrop-blur-md",
          "border-t border-neutral-900/70",
        ].join(" ")}
      >
        <div className="mx-auto max-w-5xl px-4 py-4">
          <div className="grid gap-2">
            <button
              className="w-full rounded-lg bg-neutral-900 px-3 py-2 text-left text-sm hover:bg-neutral-800"
              onClick={() => to("/offers")}
            >
              Offers
            </button>
            <button
              className="w-full rounded-lg bg-neutral-900 px-3 py-2 text-left text-sm hover:bg-neutral-800"
              onClick={() => to("/benefits")}
            >
              Benefits
            </button>
            <button
              className="w-full rounded-lg bg-neutral-900 px-3 py-2 text-left text-sm hover:bg-neutral-800"
              onClick={() => to("/rewards")}
            >
              Rewards
            </button>

            <div className="my-2 h-px bg-neutral-900/80" />

            {!ready ? (
              <>
                <div className="h-9 rounded bg-neutral-900 animate-pulse" />
                <div className="h-9 rounded border border-neutral-800 bg-neutral-900 animate-pulse" />
              </>
            ) : signedIn ? (
              <>
                {canUpgrade && (
                  <button
                    onClick={() => {
                      close();
                      routeToJoin(tier === "member" ? "pro" : "member");
                    }}
                    className="w-full rounded-lg bg-white px-3 py-2 text-sm font-medium text-black hover:bg-neutral-200"
                  >
                    {tier === "member" ? "Upgrade" : "Join"}
                  </button>
                )}
                <button
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm hover:bg-neutral-800"
                  onClick={() => to("/account")}
                >
                  Account
                </button>
              </>
            ) : (
              <>
                <button
                  className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm hover:bg-neutral-800"
                  onClick={() => to("/join?mode=signin")}
                >
                  Sign in
                </button>
                {!onJoinPage && (
                  <button
                    className="w-full rounded-lg bg-white px-3 py-2 text-sm font-medium text-black hover:bg-neutral-200"
                    onClick={() => to("/join")}
                  >
                    {primaryCtaLabel}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}