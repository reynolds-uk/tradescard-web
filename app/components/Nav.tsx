"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import HeaderAuth from "../header-client";

const links = [
  { href: "/", label: "Home" },
  { href: "/benefits", label: "Benefits" },
  { href: "/rewards", label: "Rewards" },
  { href: "/account", label: "Account" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur">
      <div className="mx-auto max-w-5xl px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="text-lg font-semibold">TradesCard</span>
          <nav className="hidden sm:flex items-center gap-2 text-sm">
            {links.map(({ href, label }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`px-3 py-1 rounded transition ${
                    active
                      ? "bg-neutral-200 text-neutral-900"
                      : "bg-neutral-800 text-neutral-100 hover:bg-neutral-700"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
        <HeaderAuth />
      </div>
    </header>
  );
}