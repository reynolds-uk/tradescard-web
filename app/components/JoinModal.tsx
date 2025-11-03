"use client";

import { useState } from "react";

type Billing = "monthly" | "annual";

type Props = {
  open: boolean;
  onClose: () => void;

  // actions
  onJoinFree: () => void;
  onMember: (billing: Billing) => void;
  onPro: (billing: Billing) => void;

  // state
  busy?: boolean;
  error?: string;

  // optional preselect for the first open
  initialPlan?: "member" | "pro" | "access";
};

function Badge({ children }: { children: string }) {
  return (
    <span className="rounded bg-neutral-800 px-2 py-0.5 text-[11px]">
      {children}
    </span>
  );
}

export default function JoinModal({
  open,
  onClose,
  onJoinFree,
  onMember,
  onPro,
  busy = false,
  error,
  initialPlan = "member",
}: Props) {
  const [billing, setBilling] = useState<Billing>("monthly");

  if (!open) return null;

  const Price = ({
    monthly,
    annual,
  }: {
    monthly: string;
    annual: string;
  }) => (
    <span className={billing === "annual" ? "text-amber-300" : "text-neutral-400"}>
      {billing === "annual" ? `${annual} /yr` : `${monthly} /mo`}
    </span>
  );

  return (
    <div aria-modal="true" role="dialog" className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/60" />

      {/* Panel */}
      <div className="relative w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl border border-neutral-800 bg-neutral-900 p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Join TradesCard</h3>
          <button onClick={onClose} className="rounded px-2 py-1 text-sm bg-neutral-800 hover:bg-neutral-700">
            Close
          </button>
        </div>

        <p className="mt-2 text-sm text-neutral-400">
          Pick a plan for protection, early deals and rewards — or join free and upgrade any time.
        </p>

        {/* Billing toggle */}
        <div className="mt-3 flex items-center gap-2 text-sm">
          <button
            type="button"
            onClick={() => setBilling("monthly")}
            className={`rounded px-2 py-1 border ${billing === "monthly" ? "border-neutral-600 bg-neutral-800" : "border-transparent hover:bg-neutral-800/50"}`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBilling("annual")}
            className={`rounded px-2 py-1 border ${billing === "annual" ? "border-neutral-600 bg-neutral-800" : "border-transparent hover:bg-neutral-800/50"}`}
            aria-label="Annual (save ~2 months)"
          >
            Annual <span className="ml-1 text-[11px] opacity-70">(save ~2 months)</span>
          </button>
        </div>

        {error && (
          <div className="mt-3 rounded border border-red-600/40 bg-red-900/10 px-3 py-2 text-red-300 text-sm">
            {error}
          </div>
        )}

        <div className="mt-4 grid gap-3">
          {/* Member */}
          <div className={`rounded-xl border p-4 ${initialPlan === "member" ? "border-neutral-700 bg-neutral-900" : "border-neutral-800 bg-neutral-900/50"}`}>
            <div className="flex items-center justify-between">
              <div className="font-medium">Member</div>
              <div className="text-sm">
                <Price monthly="£2.99" annual="£29.90" />
              </div>
            </div>
            <ul className="mt-2 text-sm text-neutral-300 space-y-1">
              <li>• Full offer access</li>
              <li>• Protect Lite benefits</li>
              <li>• Monthly prize entry</li>
              <li>• Digital card</li>
            </ul>
            <button
              onClick={() => onMember(billing)}
              disabled={busy}
              className="mt-3 inline-block rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm hover:bg-neutral-800 disabled:opacity-60"
            >
              {busy ? "Opening…" : "Choose Member"}
            </button>
          </div>

          {/* Pro */}
          <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 p-4 ring-1 ring-amber-400/30">
            <div className="flex items-center justify-between">
              <div className="font-medium">Pro</div>
              <div className="text-sm text-amber-300">
                <Price monthly="£7.99" annual="£79.90" />
              </div>
            </div>
            <ul className="mt-2 text-sm text-neutral-200 space-y-1">
              <li>• Everything in Member</li>
              <li>• Early-access deals & Pro-only offers</li>
              <li>• Double prize entries</li>
            </ul>
            <button
              onClick={() => onPro(billing)}
              disabled={busy}
              className="mt-3 inline-block rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm hover:bg-neutral-800 disabled:opacity-60"
            >
              {busy ? "Opening…" : "Choose Pro"}
            </button>
          </div>

          {/* Free */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
            <div className="flex items-center gap-2">
              <div className="font-medium">Join free</div>
              <Badge>FREE</Badge>
            </div>
            <p className="mt-1 text-sm text-neutral-400">
              Sign in to browse and redeem offers. Upgrade any time for benefits and rewards.
            </p>
            <button
              onClick={onJoinFree}
              className="mt-3 inline-block rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm hover:bg-neutral-800"
            >
              Sign in / Join free
            </button>
          </div>
        </div>

        <div className="mt-4 text-[12px] text-neutral-500">
          No purchase necessary. Free postal entry route is available on public promo pages. Paid and free routes are treated equally in draws.
        </div>
      </div>
    </div>
  );
}