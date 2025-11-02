// app/components/Nav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/src/lib/supabaseClient";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://tradescard-api.vercel.app";

function cx(...xs: Array<string | false | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export default function Nav() {
  const pathname = usePathname();
  const supabase = useMemo(() => getSupabase(), []);
  const [isPaidActive, setIsPaidActive] = useState<boolean>(false);

  useEffect(() => {
    let abort = false;

    (async () => {
      try {
        if (!supabase) return;
        const { data } = await supabase.auth.getSession();
        const user = data?.session?.user ?? null;
        if (!user) {
          if (!abort) setIsPaidActive(false);
          return;
        }

        const r = await fetch(
          `${API_BASE}/api/account?user_id=${encodeURIComponent(user.id)}`,
          { cache: "no-store" }
        );
        if (!r.ok) throw new Error(`account ${r.status}`);
        const a = await r.json();

        const tier = (a?.members?.tier as string) ?? "access";
        const status = a?.members?.status ?? "free";
        if (!abort) setIsPaidActive(tier !== "access" && status === "active");
      } catch {
        if (!abort) setIsPaidActive(false);
      }
    })();

    return () => {
      abort = true;
    };
  }, [supabase]);

  const offersHref = isPaidActive ? "/member/offers" : "/offers";
  const benefitsHref = isPaidActive ? "/member/benefits" : "/benefits";
  const rewardsHref = "/rewards"; // already handles state internally

  const links = [
    { href: offersHref, label: "Offers" },
    { href: benefitsHref, label: "Benefits" },
    { href: rewardsHref, label: "Rewards" },
    { href: "/account", label: "Account" },
  ];

  return (
    <nav className="hidden md:flex items-center gap-2 text-sm">
      {links.map(({ href, label }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={cx(
              "px-3 py-1 rounded border",
              active
                ? "border-neutral-700 bg-neutral-800 text-neutral-100"
                : "border-neutral-900 bg-neutral-900 hover:bg-neutral-800 text-neutral-300"
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}