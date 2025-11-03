// app/join/page.tsx
"use client";

import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import { useJoinModal } from "@/components/JoinModalContext";

export default function JoinPage() {
  const { openJoin } = useJoinModal();

  return (
    <Container>
      <PageHeader
        title="Join TradesCard"
        subtitle="Join free, or pick a plan with protection, early deals and monthly rewards. Switch or cancel any time."
        aside={
          <button
            onClick={() => openJoin("member")}
            className="rounded bg-neutral-800 hover:bg-neutral-700 px-3 py-2"
          >
            Sign in / Join
          </button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        {/* Member teaser card */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Member</h4>
            <span className="text-sm text-neutral-400">£2.99/mo</span>
          </div>
          <ul className="mt-3 space-y-1 text-sm text-neutral-300">
            <li>• Full offer access</li>
            <li>• Protect Lite benefits</li>
            <li>• Monthly prize entry</li>
            <li>• Digital card</li>
          </ul>
          <div className="mt-4">
            <button
              onClick={() => openJoin("member")}
              className="inline-block rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm hover:bg-neutral-800"
            >
              Choose Member
            </button>
          </div>
        </div>

        {/* Pro teaser card */}
        <div className="relative rounded-2xl border border-amber-400/40 bg-amber-400/10 p-5 ring-1 ring-amber-400/30">
          <span className="absolute right-3 -top-2 rounded bg-neutral-800 text-[11px] px-2 py-0.5">
            Best value
          </span>
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Pro</h4>
            <span className="text-sm text-amber-300">£7.99/mo</span>
          </div>
          <ul className="mt-3 space-y-1 text-sm text-neutral-200">
            <li>• Everything in Member</li>
            <li>• Early-access deals & Pro-only offers</li>
            <li>• Double prize entries</li>
          </ul>
          <div className="mt-4">
            <button
              onClick={() => openJoin("pro")}
              className="inline-block rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm hover:bg-neutral-800"
            >
              Choose Pro
            </button>
          </div>
        </div>
      </div>

      {/* Access panel */}
      <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900/50 p-5">
        <div className="flex items-center gap-2">
          <h3 className="font-medium">Prefer to start free?</h3>
          <span className="rounded bg-neutral-800 px-2 py-0.5 text-xs">FREE</span>
        </div>
        <p className="text-sm text-neutral-400 mt-1">
          Join free, redeem offers when signed in, and upgrade any time for protection, early deals and rewards
          entries.
        </p>
        <div className="mt-3">
          <button
            onClick={() => openJoin("access")}
            className="rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm hover:bg-neutral-800"
          >
            Join free
          </button>
        </div>
      </div>

      <p className="mt-6 text-[12px] text-neutral-500">
        No purchase necessary. A free postal entry route is available on public promo pages. Paid and free routes are
        treated equally in draws.
      </p>
    </Container>
  );
}