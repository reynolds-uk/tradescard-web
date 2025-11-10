// app/components/TierGate.tsx
"use client";

import React from "react";
import { useMe } from "@/lib/useMe";
import { shouldShowTrial, TRIAL_COPY } from "@/lib/trial";
import { routeToJoin } from "@/lib/routeToJoin";
import PrimaryButton from "@/components/PrimaryButton";

type Gate = "paid" | "pro";
type Tier = "access" | "member" | "pro";
type AppStatus = "free" | "trial" | "paid" | "inactive";

export default function TierGate({
  gate = "paid",
  title = gate === "pro" ? "Pro only" : "Members only",
  blurb =
    gate === "pro"
      ? "Upgrade to Pro to unlock this."
      : "Join to unlock benefits and member-only pricing.",
  children,
}: {
  gate?: Gate;
  title?: string;
  blurb?: string;
  children: React.ReactNode;
}) {
  const me = useMe();

  const signedIn = !!me?.user;
  const tier: Tier = (me?.tier as Tier) ?? "access";
  const status: AppStatus = (me?.status as AppStatus) ?? "free";

  // New status model: active if paid or on trial
  const active = status === "paid" || status === "trial";
  const isPaid = (tier === "member" || tier === "pro") && active;
  const isPro = tier === "pro" && active;

  const allowed = gate === "pro" ? isPro : isPaid;
  if (allowed) return <>{children}</>;

  const showTrial = shouldShowTrial(me);

  return (
    <div className="relative">
      {/* Blurred preview */}
      <div
        className="pointer-events-none select-none blur-[2px] opacity-60"
        aria-hidden="true"
      >
        {children}
      </div>

      {/* Overlay */}
      <div
        className="pointer-events-auto absolute inset-0 z-10 flex items-center justify-center"
        role="dialog"
        aria-label={title}
      >
        <div className="mx-4 w-full max-w-xl rounded-2xl border border-neutral-800 bg-neutral-950/95 p-5 shadow-xl backdrop-blur supports-[backdrop-filter]:bg-neutral-950/75">
          <div className="text-base font-semibold">{title}</div>
          <p className="mt-1 text-sm text-neutral-300">{blurb}</p>

          <div className="mt-3 flex flex-wrap gap-2">
            {gate === "pro" ? (
              <PrimaryButton onClick={() => routeToJoin("pro")}>
                Go Pro
              </PrimaryButton>
            ) : (
              <>
                <PrimaryButton onClick={() => routeToJoin("member")}>
                  {showTrial ? TRIAL_COPY : "Try Member"}
                </PrimaryButton>
                <button
                  onClick={() => routeToJoin("pro")}
                  className="rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm hover:bg-neutral-800"
                >
                  Go Pro
                </button>
              </>
            )}
          </div>

          {/* Sign-in hint only when NOT signed in */}
          {!signedIn && (
            <div className="mt-2 text-xs text-neutral-400">
              Already a member?{" "}
              <button
                className="underline decoration-neutral-600 underline-offset-2 hover:text-white"
                onClick={() => (window.location.href = "/join?mode=signin")}
              >
                Sign in &amp; continue
              </button>
              .
            </div>
          )}
        </div>
      </div>
    </div>
  );
}