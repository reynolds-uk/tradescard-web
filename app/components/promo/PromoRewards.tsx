"use client";

import PrimaryButton from "@/components/PrimaryButton";

type Props = {
  onJoin: () => void;       // Member (paid) CTA
  onPro: () => void;        // Pro CTA
  trialCopy?: string;       // Optional trial text e.g. "Try Member for £1 for 90 days"
};

export default function PromoRewards({ onJoin, onPro, trialCopy }: Props) {
  return (
    <div className="mx-auto max-w-5xl px-4">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Rewards</h1>
          <p className="text-sm text-neutral-300">
            Points become entries for weekly and monthly draws. Join as a paid member to start
            earning — upgrade to Pro for boosted entries.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <button
            onClick={onJoin}
            className="rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm hover:bg-neutral-800"
          >
            Become a Member
          </button>
          <PrimaryButton onClick={onPro} className="px-3 py-1.5">
            {trialCopy ?? "See plans"}
          </PrimaryButton>
        </div>
      </header>

      {/* Mobile CTAs */}
      <div className="sm:hidden mb-4 flex items-center justify-between gap-2">
        <button
          onClick={onJoin}
          className="flex-1 rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm hover:bg-neutral-800"
        >
          Become a Member
        </button>
        <PrimaryButton onClick={onPro} className="flex-1">
          {trialCopy ?? "See plans"}
        </PrimaryButton>
      </div>

      <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
        <h2 className="text-sm font-medium mb-2">How it works</h2>
        <ul className="list-disc pl-5 text-sm text-neutral-300 space-y-1">
          <li>Join as Member or Pro to start earning points each month.</li>
          <li>Your tier boosts points: Member 1.25×, Pro 1.5×.</li>
          <li>Points convert to entries for weekly spot prizes and a monthly draw.</li>
          <li>No purchase necessary — details on public promo pages.</li>
        </ul>
      </section>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <div className="text-xs text-neutral-400 mb-1">Base points</div>
          <div className="text-2xl font-semibold">—</div>
        </div>
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <div className="text-xs text-neutral-400 mb-1">Tier boost</div>
          <div className="text-2xl font-semibold">1.25× / 1.5×</div>
        </div>
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <div className="text-xs text-neutral-400 mb-1">Entries this month</div>
          <div className="text-2xl font-semibold">—</div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-center gap-3">
        <button
          onClick={onJoin}
          className="rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm hover:bg-neutral-800"
        >
          Become a Member
        </button>
        <PrimaryButton onClick={onPro}>
          {trialCopy ?? "Try Member"}
        </PrimaryButton>
      </div>
    </div>
  );
}