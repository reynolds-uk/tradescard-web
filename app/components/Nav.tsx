"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export default function Nav() {
  const pathname = usePathname();
  const supabase = createClientComponentClient();
  const [email, setEmail] = useState<string | null>(null);

  // Get current user (client-side) and store email if present
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setEmail(user?.email ?? null);
    });
  }, [supabase]);

  // Public tabs (keep this minimal and clear)
  const links = [
    { href: "/", label: "Home" },
    { href: "/offers", label: "Offers" },   // change to "/benefits" if that's your live page
    { href: "/rewards", label: "Rewards" },
  ];

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.assign("/"); // quick refresh to guest state
  }

  return (
    <header className="sticky top-0 z-30 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-lg font-semibold">TradesCard</Link>

          <nav className="hidden sm:flex items-center gap-2 text-sm">
            {links.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`px-3 py-1 rounded transition ${
                  isActive(href)
                    ? "bg-neutral-200 text-neutral-900"
                    : "bg-neutral-800 text-neutral-100 hover:bg-neutral-700"
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right-side actions: guest vs member */}
        {email ? (
          <div className="flex items-center gap-2">
            <Link
              href="/account"
              className="rounded bg-neutral-800 px-3 py-1.5 text-sm hover:bg-neutral-700"
            >
              Account
            </Link>
            <button
              onClick={handleSignOut}
              className="rounded border border-neutral-700 px-3 py-1.5 text-sm hover:bg-neutral-900"
            >
              Sign out
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href="/join"
              className="rounded border border-amber-500/40 px-3 py-1.5 text-sm text-amber-300 hover:bg-amber-500/10"
            >
              Join free
            </Link>
            <Link
              href="/pricing"
              className="rounded bg-amber-500 px-3 py-1.5 text-sm text-black hover:bg-amber-400"
            >
              Go Pro
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}