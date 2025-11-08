// app/components/Nav.tsx
"use client";
import Link from "next/link";
import { useJoinModal } from "./JoinModalContext";

export default function Nav() {
  const { openJoin } = useJoinModal();

  return (
    <header className="border-b border-neutral-900/60">
      <nav className="mx-auto max-w-5xl px-4 py-3 flex items-center gap-4">
        <Link href="/" className="font-semibold">TradesCard</Link>
        <div className="ml-auto flex items-center gap-3 text-sm">
          <Link href="/offers">Offers</Link>
          <Link href="/benefits">Benefits</Link>
          <Link href="/rewards">Rewards</Link>
          <Link href="/account">Account</Link>
          <button
            onClick={() => openJoin("member")}
            className="rounded bg-amber-400 text-black px-3 py-1.5 font-medium hover:opacity-90"
          >
            Sign in / Join
          </button>
        </div>
      </nav>
    </header>
  );
}