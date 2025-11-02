// app/components/Nav.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import HeaderAuth from "../header-client";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://tradescard-api.vercel.app";

type Elig = { eligible: boolean; email?: string | null; status?: string | null; tier?: string | null };

export default function Nav() {
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

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const user = data?.session?.user ?? null;
        if (!user) {
          if (!aborted) setElig({ eligible: false });
          return;
        }

        const r = await fetch(
          `${API_BASE}/api/account?user_id=${encodeURIComponent(user.id)}`,
          { cache: "no-store" }
        );
        if (!r.ok) {
          if (!aborted) setElig({ eligible: false, email: user.email ?? null });
          return;
        }
        const a = await r.json();
        const tier = (a?.members?.tier as string) ?? "access";
        const status = a?.members?.status ?? "free";
        const eligible = tier !== "access" && status === "active";
        if (!aborted) setElig({ eligible, email: user.email ?? null, tier, status });
      } catch {
        if (!aborted) setElig({ eligible: false });
      }
    })();

    return () => {
      aborted = true;
    };
  }, [supabase]);

  const offersHref = elig.eligible ? "/member/offers" : "/offers";
  const benefitsHref = elig.eligible ? "/member/benefits" : "/benefits";

  return (
    <header className="border-b border-neutral-900/60">
      <div className="mx-auto max-w-5xl px-4 py-3 flex items-center gap-3">
        <Link href="/" className="font-semibold tracking-tight">
          TradesCard
        </Link>

        <nav className="ml-4 flex items-center gap-2 text-sm">
          <Link
            href={offersHref}
            className="rounded bg-neutral-900 px-2 py-1 hover:bg-neutral-800"
          >
            Offers
          </Link>
          <Link
            href={benefitsHref}
            className="rounded bg-neutral-900 px-2 py-1 hover:bg-neutral-800"
          >
            Benefits
          </Link>
          <Link
            href="/rewards"
            className="rounded bg-neutral-900 px-2 py-1 hover:bg-neutral-800"
          >
            Rewards
          </Link>
          <Link
            href="/account"
            className="rounded bg-neutral-900 px-2 py-1 hover:bg-neutral-800"
          >
            Account
          </Link>
        </nav>

        <div className="ml-auto">
          <HeaderAuth />
        </div>
      </div>
    </header>
  );
}