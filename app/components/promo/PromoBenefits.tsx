// app/components/promo/PromoBenefits.tsx
"use client";

import PrimaryButton from "@/components/PrimaryButton";

export default function PromoBenefits({
  onJoin,
  onPro,
}: {
  onJoin: () => void;   // routeToJoin("member")
  onPro: () => void;    // routeToJoin("pro")
}) {
  return (
    <div className="space-y-4">
      {/* Hero */}
      <div className="rounded-2xl border border-neutral-800 bg-gradient-to-br from-neutral-900 to-neutral-950 p-5">
        <div className="text-2xl font-semibold">Member Benefits</div>
        <p className="mt-2 text-sm text-neutral-300">
          Protection, support and extras built for the UK trades community. Available on paid plans.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <PrimaryButton onClick={onJoin}>Try Member for £1</PrimaryButton>
          <button
            onClick={onPro}
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm hover:bg-neutral-800"
          >
            Go Pro
          </button>
        </div>
      </div>

      {/* Benefits grid (promo view – no “Join free” here) */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
          <div className="text-sm text-neutral-400">Included with Member</div>
          <div className="mt-1 font-semibold">Protect Lite</div>
          <p className="mt-1 text-sm text-neutral-400">
            Purchase protection and dispute help on eligible redemptions.
          </p>
        </div>
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
          <div className="text-sm text-neutral-400">Included with Member</div>
          <div className="mt-1 font-semibold">Priority Support</div>
          <p className="mt-1 text-sm text-neutral-400">
            Faster responses when you need us most.
          </p>
        </div>
        <div className="rounded-2xl border border-amber-400/40 bg-amber-400/10 p-5 ring-1 ring-amber-400/30">
          <div className="text-sm text-amber-200">Pro only</div>
          <div className="mt-1 font-semibold">Early-access deals</div>
          <p className="mt-1 text-sm text-amber-100/90">
            First dibs on limited-quantity and partner-exclusive offers.
          </p>
          <div className="mt-3">
            <PrimaryButton onClick={onPro}>Upgrade to Pro</PrimaryButton>
          </div>
        </div>
      </div>

      {/* CTA bar */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-neutral-300">
          Ready to unlock benefits? Start with Member or go Pro.
        </div>
        <div className="flex gap-2">
          <PrimaryButton onClick={onJoin}>Try Member for £1</PrimaryButton>
          <button
            onClick={onPro}
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm hover:bg-neutral-800"
          >
            Go Pro
          </button>
        </div>
      </div>
    </div>
  );
}