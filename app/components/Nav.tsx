// app/components/Nav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Container from "./Container";
import HeaderAuth from "../header-client";

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export default function Nav() {
  const pathname = usePathname();

  const tab = "px-3 py-1 rounded text-sm whitespace-nowrap";
  const tabIdle = "text-neutral-300 hover:bg-neutral-900";
  const tabActive = "bg-neutral-800 text-neutral-100";
  const isActive = (href: string) => pathname === href;

  return (
    <header className="sticky top-0 z-50 border-b border-neutral-900/60 backdrop-blur supports-[backdrop-filter]:bg-neutral-950/70">
      <Container className="flex h-14 items-center gap-3">
        <Link href="/" className="font-semibold text-neutral-100 mr-1">
          TradesCard
        </Link>

        {/* Tabs (scrollable on mobile) */}
        <nav className="flex gap-1 overflow-x-auto no-scrollbar">
          <Link
            href="/offers"
            className={cx(tab, isActive("/offers") ? tabActive : tabIdle)}
            aria-current={isActive("/offers") ? "page" : undefined}
          >
            Offers
          </Link>
          <Link
            href="/benefits"
            className={cx(tab, isActive("/benefits") ? tabActive : tabIdle)}
            aria-current={isActive("/benefits") ? "page" : undefined}
          >
            Benefits
          </Link>
          <Link
            href="/rewards"
            className={cx(tab, isActive("/rewards") ? tabActive : tabIdle)}
            aria-current={isActive("/rewards") ? "page" : undefined}
          >
            Rewards
          </Link>
        </nav>

        <div className="flex-1" />

        {/* Right-side auth chip / Sign in button */}
        <HeaderAuth />
      </Container>
    </header>
  );
}