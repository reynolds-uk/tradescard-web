"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useCallback } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { usePathname } from "next/navigation";
import Container from "./Container";
import HeaderAuth from "../header-client";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://tradescard-api.vercel.app";

type Tier = "access" | "member" | "pro";
type Elig = {
  eligible: boolean;
  email?: string | null;
  status?: string | null;
  tier?: Tier | null;
};

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export default function Nav() {
  const pathname = usePathname();

  // Client-only Supabase
  const supabase = useMemo<SupabaseClient>(() => {
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }, []);

  const [elig, setElig] = useState<Elig>({ eligible: false });

  const resolveEligibility = useCallback(
    async (uid?: string | null, email?: string | null) => {
      if (!uid) {
        setElig({ eligible: false });
        return;
      }
      try {
        const r = await fetch(
          `${API_BASE}/api/account?user_id=${encodeURIComponent(uid)}`,
          { cache: "no-store" }
        );
        if (!r.ok) {
          setElig({ eligible: false, email: email ?? null });
          return;
        }
        const a = await r.json();
        const tier = (a?.members?.tier as Tier | undefined) ?? "access";
        const status = (a?.members?.status as string | undefined) ?? "free";
        const isEligible = tier !== "access" && status === "active";
        setElig({ eligible: isEligible, email: email ?? null, tier, status });
      } catch {
        setElig({ eligible: false, email: email ?? null });
      }
    },
    []
  );

  // Initial load + auth change subscription
  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      const user = data?.session?.user ?? null;
      if (!mounted) return;
      await resolveEligibility(user?.id ?? null, user?.email ?? null);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_evt, sess) => {
      const u = sess?.user ?? null;
      await resolveEligibility(u?.id ?? null, u?.email ?? null);
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe();
    };
  }, [supabase, resolveEligibility]);

  const offersHref = "/offers";
  const benefitsHref = "/benefits";

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
            href={offersHref}
            className={cx(tab, isActive("/offers") ? tabActive : tabIdle)}
            aria-current={isActive("/offers") ? "page" : undefined}
          >
            Offers
          </Link>
          <Link
            href={benefitsHref}
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
          {/* No “Account” tab — handled by HeaderAuth menu */}
        </nav>

        <div className="flex-1" />

        {/* Right-side auth chip / Sign in button */}
        <HeaderAuth />
      </Container>
    </header>
  );
}