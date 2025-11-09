// app/components/TierGate.tsx
"use client";

import React from "react";
import PrimaryButton from "@/components/PrimaryButton";
import { useMe } from "@/lib/useMe";
import { routeToJoin } from "@/lib/routeToJoin";
import { shouldShowTrial, TRIAL_COPY } from "@/lib/trial";

type Tier = "access" | "member" | "pro";

/**
 * Gate content for a required tier.
 * - gate="paid" means member OR pro.
 * - gate="member" means member OR pro.
 * - gate="pro" means pro only.
 *
 * If the user doesn’t qualify, we render children behind a blur with an overlay CTA.
 */
export default function TierGate({
  children,
  gate = "paid",
  title = "Members only",
  blurb = "Sign in on a paid plan to unlock this area.",
}: {
  children: React.ReactNode;
  gate?: "paid" | "member" | "pro";
  title?: string;
  blurb?: string;
}) {
  const me = useMe(); // { ready, user?, tier?, status? }
  const tier: Tier = (me?.tier as Tier) ?? "access";
  const status = me?.status ?? "inactive";
  const isPaid =
    (tier === "member" || tier === "pro") &&
    (status === "active" || status === "trialing");

  const showTrial = shouldShowTrial(me);

  // Determine access
  let qualifies = false;
  if (gate === "paid" || gate === "member") {
    qualifies = isPaid; // either member or pro in an active/trialing state
  }
  if (gate === "pro") {
    qualifies = tier === "pro" && (status === "active" || status === "trialing");
  }

  if (qualifies) {
    return <>{children}</>;
  }

  // Not qualified → show blurred preview with upgrade overlay
  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none blur-sm contrast-75"
      >
        {children}
      </div>

      <div className="absolute inset-0 z-10 flex items-end sm:items-center justify-center">
        <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" />

        <div className="relative z-10 w-full max-w-[560px] rounded-t-2xl sm:rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
          <div className="mb-1 text-base font-semibold">{title}</div>
          <p className="text-sm text-neutral-300">{blurb}</p>

          <div className="mt-3 grid gap-2 sm:grid-cols-[auto_auto] sm:justify-end">
            <PrimaryButton
              onClick={() => routeToJoin("member")}
              className="text-sm"
            >
              {showTrial ? TRIAL_COPY : "Become a Member"}
            </PrimaryButton>

            <button
              onClick={() => routeToJoin("pro")}
              className="rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm hover:bg-neutral-800"
            >
              Go Pro
            </button>
          </div>

          <div className="mt-2 text-[11px] text-neutral-500">
            Already a member? <button onClick={() => routeToJoin("member")} className="underline underline-offset-2">Sign in & continue</button>.
          </div>
        </div>
      </div>
    </div>
  );
}