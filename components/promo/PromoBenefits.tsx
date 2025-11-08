// components/promo/PromoBenefits.tsx
"use client";

import Container from "@/components/Container";
import PrimaryButton from "@/components/PrimaryButton";

type Props = {
  onJoin: () => void;
  onPro: () => void;
  trialCopy?: string;
};

export default function PromoBenefits({ onJoin, onPro, trialCopy }: Props) {
  return (
    <Container>
      {/* Hero */}
      <div className="mb-4">
        <h1 className="text-xl font-semibold">Member Benefits</h1>
        <p className="text-sm text-neutral-300">
          Protection, support and extras built for the UK trades community. Available on paid plans.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <PrimaryButton onClick={onJoin}>
            {trialCopy ?? "Try Member for £1"}
          </PrimaryButton>
          <button
            onClick={onPro}
            className="rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm hover:bg-neutral-800"
          >
            Go Pro
          </button>
        </div>
      </div>

      {/* Teaser tiles (contained, no full-bleed) */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
          <div className="text-xs text-neutral-400 mb-1">Included with Member</div>
          <div className="font-semibold">Protect Lite</div>
          <p className="mt-1 text-sm text-neutral-400">
            Purchase protection and dispute help on eligible redemptions.
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
          <div className="text-xs text-neutral-400 mb-1">Included with Member</div>
          <div className="font-semibold">Priority Support</div>
          <p className="mt-1 text-sm text-neutral-400">
            Faster responses when you need us most.
          </p>
        </div>

        <div className="rounded-2xl border border-amber-400/30 bg-amber-400/5 p-5">
          <div className="text-xs text-amber-300 mb-1">Pro only</div>
          <div className="font-semibold">Early-access deals</div>
          <p className="mt-1 text-sm text-neutral-300">
            First dibs on limited-quantity and partner-exclusive offers.
          </p>
          <div className="mt-3">
            <PrimaryButton onClick={onPro}>Upgrade to Pro</PrimaryButton>
          </div>
        </div>
      </div>

      {/* Nudge (contained) */}
      <div className="mt-4 rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 flex items-center justify-between">
        <div className="text-sm text-neutral-300">
          Ready to unlock benefits? Start with Member or go Pro.
        </div>
        <div className="flex gap-2">
          <PrimaryButton onClick={onJoin}>
            {trialCopy ?? "Try Member for £1"}
          </PrimaryButton>
          <button
            onClick={onPro}
            className="rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm hover:bg-neutral-800"
          >
            Go Pro
          </button>
        </div>
      </div>
    </Container>
  );
}