// app/components/promo/PromoRewards.tsx
"use client";

import PrimaryButton from "@/components/PrimaryButton";

export default function PromoRewards({
  onJoin,
  onPro,
}: {
  onJoin: () => void;   // routeToJoin("member")
  onPro: () => void;    // routeToJoin("pro")
}) {
  return (
    <div className="space-y-4">
      {/* Explainer */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
        <div className="font-semibold text-lg">How rewards work</div>
        <ul className="mt-2 list-disc list-inside text-sm text-neutral-300 space-y-1">
          <li>Paid Members earn points each month.</li>
          <li>Your tier boosts points: Member 1.25×, Pro 1.5×.</li>
          <li>Points become entries for weekly spot prizes and a monthly draw.</li>
          <li>Free postal entry route available on public promo pages.</li>
        </ul>
      </div>

      {/* Stat preview (locked) */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <div className="text-sm text-neutral-400">Points this month (base)</div>
          <div className="mt-2 text-3xl font-semibold">—</div>
          <div className="mt-1 text-xs text-neutral-500">Unlock with a paid plan</div>
        </div>
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <div className="text-sm text-neutral-400">Tier boost</div>
          <div className="mt-2 text-3xl font-semibold">—</div>
          <div className="mt-1 text-xs text-neutral-500">Member 1.25× · Pro 1.5×</div>
        </div>
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <div className="text-sm text-neutral-400">Entries this month</div>
          <div className="mt-2 text-3xl font-semibold">—</div>
          <div className="mt-1 text-xs text-neutral-500">Shown once active</div>
        </div>
      </div>

      {/* CTA bar */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-neutral-300">
          Get entries every month you’re a paid member. Tier boosts apply automatically.
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