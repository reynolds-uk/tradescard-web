// components/JoinModal.tsx
"use client";

import { useEffect, useMemo } from "react";

type Plan = "access" | "member" | "pro";

type Props = {
  open: boolean;
  onClose: () => void;
  onJoinFree: () => void;
  onMember: () => void;
  onPro: () => void;
  busy?: boolean;
  error?: string;
  /** Preselect the plan the user clicked on (affects emphasis & primary CTA) */
  initialPlan?: Plan;
};

function Badge({ children }: { children: string }) {
  return (
    <span className="rounded bg-neutral-800 px-2 py-0.5 text-xs">
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
  busy,
  error,
  initialPlan,
}: Props) {
  // Prevent body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Close on ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Decide which card is visually highlighted
  const memberHighlight = useMemo(
    () => initialPlan === "member",
    [initialPlan]
  );
  const proHighlight = useMemo(() => initialPlan === "pro", [initialPlan]);

  if (!open) return null;

  return (
    <div
      aria-modal="true"
      role="dialog"
      aria-labelledby="join-title"
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
    >
      {/* Backdrop */}
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/60"
      />

      {/* Panel (mobile sheet / desktop modal) */}
      <div
        className="
          relative w-full sm:max-w-lg
          rounded-t-2xl sm:rounded-2xl
          border border-neutral-800
          bg-neutral-900
          p-4 sm:p-5
          shadow-xl
          animate-in fade-in zoom-in-95
        "
      >
        <div className="flex items-center justify-between">
          <h3 id="join-title" className="text-lg font-semibold">
            Join TradesCard
          </h3>
          <button
            onClick={onClose}
            className="rounded px-2 py-1 text-sm bg-neutral-800 hover:bg-neutral-700"
          >
            Close
          </button>
        </div>

        <p className="mt-2 text-sm text-neutral-400">
          Pick a plan for protection, early deals and rewards — or join free and
          upgrade any time.
        </p>

        {error && (
          <div className="mt-3 rounded border border-red-600/40 bg-red-900/10 px-3 py-2 text-red-300 text-sm">
            {error}
          </div>
        )}

        <div className="mt-4 grid gap-3">
          {/* Member */}
          <div
            className={
              "rounded-xl p-4 " +
              (memberHighlight
                ? "border border-amber-400/40 bg-amber-400/10 ring-1 ring-amber-400/30"
                : "border border-neutral-800 bg-neutral-900/50")
            }
          >
            <div className="flex items-center justify-between">
              <div className="font-medium">Member</div>
              <div
                className={
                  memberHighlight ? "text-sm text-amber-300" : "text-sm text-neutral-400"
                }
              >
                £2.99/mo
              </div>
            </div>
            <ul className="mt-2 text-sm text-neutral-300 space-y-1">
              <li>• Full offer access</li>
              <li>• Protect Lite benefits</li>
              <li>• Monthly prize entry</li>
              <li>• Digital card</li>
            </ul>
            <button
              onClick={onMember}
              disabled={busy}
              className="mt-3 inline-block rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm hover:bg-neutral-800 disabled:opacity-60"
            >
              {busy ? "Opening…" : "Choose Member"}
            </button>
          </div>

          {/* Pro */}
          <div
            className={
              "rounded-xl p-4 " +
              (proHighlight
                ? "border border-amber-400/40 bg-amber-400/10 ring-1 ring-amber-400/30"
                : "border border-neutral-800 bg-neutral-900/50")
            }
          >
            <div className="flex items-center justify-between">
              <div className="font-medium">Pro</div>
              <div
                className={
                  proHighlight ? "text-sm text-amber-300" : "text-sm text-neutral-400"
                }
              >
                £7.99/mo
              </div>
            </div>
            <ul className="mt-2 text-sm text-neutral-300 space-y-1">
              <li>• Everything in Member</li>
              <li>• Early-access deals & Pro-only offers</li>
              <li>• Double prize entries</li>
            </ul>
            <button
              onClick={onPro}
              disabled={busy}
              className="mt-3 inline-block rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm hover:bg-neutral-800 disabled:opacity-60"
            >
              {busy ? "Opening…" : (proHighlight ? "Choose Pro (recommended)" : "Choose Pro")}
            </button>
          </div>

          {/* Free */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
            <div className="flex items-center gap-2">
              <div className="font-medium">Join free</div>
              <Badge>ACCESS</Badge>
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
          No purchase necessary. Free postal entry route is available on public promo
          pages. Paid and free routes are treated equally in draws.
        </div>
      </div>
    </div>
  );
}