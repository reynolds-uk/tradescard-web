// app/nav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import HeaderAuth from "./header-client"; // your existing magic-link UI

export default function Nav() {
  const pathname = usePathname();
  const supabase = createClientComponentClient();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setEmail(user?.email ?? null);
    });
  }, [supabase]);

  const isActive = (href: string) => pathname.startsWith(href);

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.assign("/");
  }

  return (
    <header className="sticky top-0 z-30 border-b border-neutral-800 bg-black/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        {/* Brand */}
        <Link
          href="/"
          className="text-lg font-bold tracking-tight text-white hover:text-amber-400 transition"
        >
          TradesCard
        </Link>

        {/* Centre nav (members only) */}
        {email ? (
          <nav className="hidden sm:flex items-center gap-2 text-sm">
            <Link
              href="/offers"
              className={`px-3 py-1 rounded transition ${
                isActive("/offers")
                  ? "bg-neutral-200 text-neutral-900"
                  : "text-neutral-200 hover:bg-neutral-800"
              }`}
            >
              Offers
            </Link>
            <Link
              href="/rewards"
              className={`px-3 py-1 rounded transition ${
                isActive("/rewards")
                  ? "bg-neutral-200 text-neutral-900"
                  : "text-neutral-200 hover:bg-neutral-800"
              }`}
            >
              Rewards
            </Link>
          </nav>
        ) : (
          <div /> /* keep spacing aligned when logged out */
        )}

        {/* Right side: auth controls */}
        {email ? (
          <div className="flex items-center gap-2">
            <Link
              href="/account"
              className={`rounded px-3 py-1.5 text-sm transition ${
                isActive("/account")
                  ? "bg-amber-500 text-black"
                  : "bg-neutral-800 text-white hover:bg-neutral-700"
              }`}
            >
              Account
            </Link>
            <button
              onClick={handleSignOut}
              className="rounded border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-900"
            >
              Sign out
            </button>
          </div>
        ) : (
          // your existing magic-link sign-in UI
          <HeaderAuth />
        )}
      </div>
    </header>
  );
}