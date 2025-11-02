"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import HeaderAuth from "./header-client"; // your existing auth UI

export default function Nav() {
  const pathname = usePathname();
  const supabase = createClientComponentClient();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setEmail(user?.email ?? null));
  }, [supabase]);

  const active = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  async function signOut() {
    await supabase.auth.signOut();
    window.location.assign("/");
  }

  return (
    <header className="sticky top-0 z-30 border-b border-neutral-800 bg-black/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4" data-nav="v2">
        <Link href="/" className="text-lg font-bold tracking-tight hover:text-amber-400">
          TradesCard
        </Link>

        {/* Only show product links when signed in */}
        {email ? (
          <nav className="hidden sm:flex items-center gap-2 text-sm">
            <Link
              href="/offers"
              className={`px-3 py-1 rounded ${active("/offers") ? "bg-neutral-200 text-neutral-900" : "text-neutral-200 hover:bg-neutral-800"}`}
            >
              Offers
            </Link>
            <Link
              href="/rewards"
              className={`px-3 py-1 rounded ${active("/rewards") ? "bg-neutral-200 text-neutral-900" : "text-neutral-200 hover:bg-neutral-800"}`}
            >
              Rewards
            </Link>
            <Link
              href="/account"
              className={`px-3 py-1 rounded ${active("/account") ? "bg-amber-500 text-black" : "text-neutral-200 hover:bg-neutral-800"}`}
            >
              Account
            </Link>
            <button onClick={signOut} className="px-3 py-1 rounded border border-neutral-700 text-neutral-300 hover:bg-neutral-900">
              Sign out
            </button>
          </nav>
        ) : (
          <HeaderAuth /> // compact sign-in for guests
        )}
      </div>
    </header>
  );
}