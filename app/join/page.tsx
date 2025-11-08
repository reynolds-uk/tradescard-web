// app/join/page.tsx
"use client";

import { useMemo, useState } from "react";
import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import { useJoinActions } from "@/components/useJoinActions";
import { useMe } from "@/lib/useMe"; // centralised auth/tier state
import { track } from "@/lib/track";

type Tier = "access" | "member" | "pro";

// Trial flags (switchable in .env)
const TRIAL_ACTIVE = process.env.NEXT_PUBLIC_TRIAL_ACTIVE === "true";
const TRIAL_COPY =
  process.env.NEXT_PUBLIC_TRIAL_COPY || "Try Member for £1 (90 days)";

export default function JoinPage() {
  // Determine where to return after auth/checkout
  const next = typeof window !== "undefined" ? window.location.pathname : "/join";

  const { user, tier, status, ready } = useMe();
  const { busy, error, joinFree, startMembership } = useJoinActions(next);

  // show the trial banner only if enabled AND user is not already an active member/pro
  const showTrial = TRIAL_ACTIVE && !(status === "active" && (tier === "member" || tier === "pro"));

  // CTA handlers – direct (no modal)
  const onMember = async () => {
    track("join_member_click", { trial: showTrial });
    await startMembership("member");
  };

  const onPro = async () => {
    track("join_pro_click", {});
    await startMembership("pro");
  };

  const onFree = async () => {
    track("join_free_click", {});
    await joinFree();
  };

  return (
    <Container>
      <PageHeader
        title="Join TradesCard"
        subtitle="Join free, or pick a plan with protection, early deals and monthly rewards. Switch or cancel any time."
        aside={
          showTrial ? (
            <span className="hidden sm:inline rounded bg-amber-400/20 text-amber-200 text-xs px-2 py-1 border border-amber-400/30">
              {TRIAL_COPY}
            </span>
          ) : undefined
        }
      />

      {error && (
        <div className="mb-4 rounded border border-red-600/40 bg-red-900/10 px-3 py-2 text-red-300 text-sm">
          {error}
        </div>
      )}

      {showTrial && (
        <div className="mb-4 rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-200">
          Limited-time offer: {TRIAL_COPY}
        </div>
      )}

      {/* Pricing chooser – simple, compact, no modal */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Member */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
          <div className="flex items-baseline justify-between">
            <div className="text-lg font-semibold">Member</div>
            <div className="text-sm text-neutral-400">£2.99/mo</div>
          </div>
          <ul className="mt-3 space-y-1 text-sm text-neutral-300">
            <li>• Full offer access</li>
            <li>• Protect Lite benefits</li>
            <li>• Monthly prize entry</li>
            <li>• Digital card</li>
          </ul>
          <button
            onClick={onMember}
            disabled={busy || !ready}
            className="mt-4 w-full rounded bg-amber-400 px-4 py-2 text-sm font-medium text-black hover:opacity-90 disabled:opacity-60"
          >
            {showTrial ? "Try Member for £1 for 90 days" : "Start Member"}
          </button>
        </div>

        {/* Pro */}
        <div className="rounded-2xl border border-amber-400/40 bg-neutral-900 p-5">
          <div className="flex items-baseline justify-between">
            <div className="text-lg font-semibold">Pro</div>
            <div className="text-sm text-neutral-400">£7.99/mo</div>
          </div>
          <ul className="mt-3 space-y-1 text-sm text-neutral-300">
            <li>• Everything in Member</li>
            <li>• Early-access deals & Pro-only offers</li>
            <li>• Double prize entries</li>
          </ul>
          <button
            onClick={onPro}
            disabled={busy || !ready}
            className="mt-4 w-full rounded border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm hover:bg-neutral-800 disabled:opacity-60"
          >
            Choose Pro
          </button>
        </div>
      </div>

      {/* Free join (de-emphasised) */}
      <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-neutral-300">
            Prefer to start free? Sign in to browse and redeem offers. Upgrade any time.
          </div>
          <button
            onClick={onFree}
            disabled={busy || !ready}
            className="rounded border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm hover:bg-neutral-800 disabled:opacity-60"
          >
            Join free
          </button>
        </div>
      </div>

      {/* Reassurance */}
      <div className="mt-3 text-xs text-neutral-500">
        Cancel any time • Secure checkout • You’ll return to {next}
      </div>
    </Container>
  );
}