// app/welcome/page.tsx
"use client";

import Link from "next/link";
import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";

export default function WelcomePage() {
  return (
    <Container>
      <PageHeader
        title="Welcome to TradesCard 👋"
        subtitle="You’re on Access (Free). Start saving now, and upgrade any time for more perks and rewards."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
          <div className="font-medium mb-1">Browse offers</div>
          <p className="text-sm text-neutral-400 mb-3">Start saving right away on tools, fuel, and more.</p>
          <Link href="/offers" className="inline-block rounded bg-neutral-200 text-neutral-900 text-sm px-3 py-2">
            View offers
          </Link>
        </div>

        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
          <div className="font-medium mb-1">See benefits</div>
          <p className="text-sm text-neutral-400 mb-3">What you get as a Member and Pro.</p>
          <Link href="/benefits" className="inline-block rounded border border-neutral-800 bg-neutral-950 text-sm px-3 py-2 hover:bg-neutral-900">
            View benefits
          </Link>
        </div>

        <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-5">
          <div className="font-medium mb-1">Upgrade for more</div>
          <p className="text-sm text-neutral-200 mb-3">Member £2.99/mo • Pro £7.99/mo.</p>
          <div className="flex gap-2">
            <Link href="/checkout?plan=member&billing=monthly" className="inline-block rounded bg-neutral-200 text-neutral-900 text-sm px-3 py-2">
              Join Member
            </Link>
            <Link href="/checkout?plan=pro&billing=monthly" className="inline-block rounded border border-neutral-800 bg-neutral-950 text-sm px-3 py-2 hover:bg-neutral-900">
              Go Pro
            </Link>
          </div>
        </div>
      </div>

      <p className="mt-6 text-[12px] text-neutral-500">
        No purchase necessary. A free postal entry route is available on public promo pages. Paid and free routes are treated equally in draws.
      </p>
    </Container>
  );
}