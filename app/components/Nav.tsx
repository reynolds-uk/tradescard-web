// app/components/Nav.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { usePathname } from "next/navigation";
import HeaderAuth from "../header-client";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://tradescard-api.vercel.app";

type Elig = {
  eligible: boolean;
  email?: string | null;
  status?: string | null;
  tier?: string | null;
};

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export default function Nav() {
  const pathname = usePathname();

  const supabase = useMemo(
    () =>
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const [elig, setElig] = useState<Elig>({ eligible: false });

  useEffect(() => {
    let aborted = false;

    async function resolveEligibility() {
      try {
        const { data } = await supabase.auth.getSession();
        const user = data?.session?.user ?? null;

        if (!user) {
          if (!aborted) {
            setElig({ eligible: false });
          }
          return;
        }

        const r = await fetch(
          `${API_BASE}/api/account?user_id=${encodeURIComponent(user.id)}`,
          { cache: "no-store" }
        );

        if (!r.ok) {
          if (!aborted) {
            setElig({ eligible: false, email: user.email ?? null });
          }
          return;
        }

        const a = await r.json();
        const tier = (a?.members?.tier as string) ?? "access";
        const status = a?.members?.status ?? "free";
        const isEligible = tier !== "access" && status === "active";

        if (!aborted) {
          setElig({
            eligible: isEligible,
            email: user.email ?? null,
            tier,
            status,
          });
        }
      } catch {
        if (!aborted) {
          setElig({ eligible: false });
        }
      }
    }

    resolveEligibility();
    return () => {
      aborted = true;
    };
  }, [supabase]);

  const offersHref = elig.eligible ? "/member/offers" : "/offers";
  const benefitsHref = elig.eligible ? "/member/benefits" : "/benefits";

  const linkBase =
    "px-3 py-1 rounded transition bg-neutral-800 text-neutral-100 hover:bg-neutral-700";
  const linkActive = "bg-neutral-200 text-neutral-900";
  const isActive = (href: string) =>
    pathname === href ||
    // treat parent route as active when on the member version
    (href === "/offers" && pathname === "/member/offers") ||
    (href === "/benefits" && pathname === "/member/benefits");

  return (
    <header className="sticky top-0 z-30 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur">
      <div className="mx-auto max-w-5xl px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link className="text-lg font-semibold" href="/">
            TradesCard
          </Link>

          <nav className="hidden sm:flex items-center gap-2 text-sm">
            <Link
              href={offersHref}
              className={cx(linkBase, isActive("/offers") && linkActive)}
            >
              Offers
            </Link>
            <Link
              href={benefitsHref}
              className={cx(linkBase, isActive("/benefits") && linkActive)}
            >
              Benefits
            </Link>
            <Link
              href="/rewards"
              className={cx(linkBase, isActive("/rewards") && linkActive)}
            >
              Rewards
            </Link>
            <Link
              href="/account"
              className={cx(linkBase, isActive("/account") && linkActive)}
            >
              Account
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <HeaderAuth />
        </div>
      </div>
    </header>
  );
}