// app/components/Nav.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import HeaderAuth from "../header-client";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://tradescard-api.vercel.app";

type Elig = { eligible: boolean; email?: string | null; status?: string | null; tier?: string | null };

function navClass(active: boolean) {
  return [
    "rounded px-3 py-1 text-sm transition",
    active ? "bg-neutral-200 text-neutral-900" : "bg-neutral-900 text-neutral-100 hover:bg-neutral-800",
  ].join(" ");
}

export default function Nav() {
  const pathname = usePathname();
  const supabase = useMemo(
    () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!),
    []
  );

  const [elig, setElig] = useState<Elig>({ eligible: false });

  useEffect(() => {
    let aborted = false;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const user = data?.session?.user ?? null;
        if (!user) return void (!aborted && setElig({ eligible: false }));

        const r = await fetch(`${API_BASE}/api/account?user_id=${encodeURIComponent(user.id)}`, { cache: "no-store" });
        if (!r.ok) return void (!aborted && setElig({ eligible: false, email: user.email ?? null }));
        const a = await r.json();
        const tier = (a?.members?.tier as string) ?? "access";
        const status = a?.members?.status ?? "free";
        const eligible = tier !== "access" && status === "active";
        !aborted && setElig({ eligible, email: user.email ?? null, tier, status });
      } catch {
        !aborted && setElig({ eligible: false });
      }
    })();
    return () => { aborted = true; };
  }, [supabase]);

  const offersHref = elig.eligible ? "/member/offers" : "/offers";
  const benefitsHref = elig.eligible ? "/member/benefits" : "/benefits";

  // Simple active checks (covers both public and member routes)
  const isOffers = pathname?.startsWith("/offers") || pathname?.startsWith("/member/offers");
  const isBenefits = pathname?.startsWith("/benefits") || pathname?.startsWith("/member/benefits");
  const isRewards = pathname === "/rewards";
  const isAccount = pathname === "/account" || pathname?.startsWith("/join");

  return (
    <header className="border-b border-neutral-900/60 sticky top-0 z-30 bg-neutral-950/80 backdrop-blur">
      <div className="mx-auto max-w-5xl px-4 py-3 flex items-center gap-3">
        <Link href="/" className="font-semibold tracking-tight">TradesCard</Link>
        <nav className="ml-4 flex items-center gap-2">
          <Link href={offersHref} className={navClass(!!isOffers)}>Offers</Link>
          <Link href={benefitsHref} className={navClass(!!isBenefits)}>Benefits</Link>
          <Link href="/rewards" className={navClass(!!isRewards)}>Rewards</Link>
          <Link href="/account" className={navClass(!!isAccount)}>Account</Link>
        </nav>
        <div className="ml-auto"><HeaderAuth /></div>
      </div>
    </header>
  );
}