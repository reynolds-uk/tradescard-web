"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import { useMe } from "@/lib/useMe";
import { useJoinActions } from "@/components/useJoinActions";

type Plan = "access" | "member" | "pro";

const TRIAL_ACTIVE = process.env.NEXT_PUBLIC_TRIAL_ACTIVE === "true";
const TRIAL_COPY = process.env.NEXT_PUBLIC_TRIAL_COPY || "Try Member for £1 for 90 days";

export default function JoinPage() {
  const { user, tier, status, ready } = useMe();
  const router = useRouter();
  const params = useSearchParams();

  // Where to return after auth / checkout
  const next = "/welcome";
  const { startMembership, joinFree, busy, error } = useJoinActions(next);

  // If we arrived with ?intent=member|pro and we’re signed in, auto-start checkout
  const intent = (params.get("intent") as Plan | null) ?? null;
  useEffect(() => {
    if (!ready) return;
    if (!user) return;
    if (!intent || intent === "access") return;
    // Avoid loop: only auto-run once when we’ve just landed with intent
    startMembership(intent);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, user, intent]);

  // Clicks on Member/Pro from this page:
  const choosePlan = (plan: Exclude<Plan, "access">) => {
    if (user) {
      startMembership(plan);
      return;
    }
    // Not signed in: send to auth with a resume intent back to this page
    const resume = `/join?intent=${plan}`;
    router.push(`/auth?next=${encodeURIComponent(resume)}`);
  };

  // Clicks on “Join free”
  const chooseFree = () => {
    if (user) {
      joinFree();
      return;
    }
    router.push(`/auth?next=${encodeURIComponent("/welcome")}`);
  };

  const showTrialBanner =
    TRIAL_ACTIVE && !(status === "active" && (tier === "member" || tier === "pro"));

  return (
    <Container>
      <PageHeader title="Join TradesCard" subtitle="Join free, or pick a plan with protection, early deals and monthly rewards. Switch or cancel any time." />

      {showTrialBanner && (
        <div className="mb-4 rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-200">
          Limited-time offer: {TRIAL_COPY}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded border border-red-600/40 bg-red-900/10 p-3 text-red-300 text-sm">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Member */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
          <div className="flex items-start justify-between">
            <div className="font-semibold">Member</div>
            <div className="text-sm text-neutral-400">£2.99/mo</div>
          </div>
          <ul className="mt-3 space-y-1 text-sm text-neutral-300">
            <li>• Full offer access</li>
            <li>• Protect Lite benefits</li>
            <li>• Monthly prize entry</li>
            <li>• Digital card</li>
          </ul>
          <button
            onClick={() => choosePlan("member")}
            disabled={busy}
            className="mt-4 rounded bg-amber-400 px-4 py-2 text-sm font-medium text-black hover:opacity-90 disabled:opacity-60"
          >
            {TRIAL_ACTIVE ? TRIAL_COPY : "Choose Member"}
          </button>
        </div>

        {/* Pro */}
        <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-5">
          <div className="flex items-start justify-between">
            <div className="font-semibold">Pro</div>
            <div className="text-sm text-neutral-400">£7.99/mo</div>
          </div>
          <div className="mt-1 inline-block rounded bg-amber-400/20 px-2 py-0.5 text-[11px] text-amber-200">
            Best value
          </div>
          <ul className="mt-3 space-y-1 text-sm text-neutral-200">
            <li>• Everything in Member</li>
            <li>• Early-access deals & Pro-only offers</li>
            <li>• Double prize entries</li>
          </ul>
          <button
            onClick={() => choosePlan("pro")}
            disabled={busy}
            className="mt-4 rounded bg-neutral-900 px-4 py-2 text-sm hover:bg-neutral-800 disabled:opacity-60"
          >
            Choose Pro
          </button>
        </div>
      </div>

      {/* Free tier */}
      <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
        <div className="font-semibold">Prefer to start free? <span className="ml-1 rounded bg-neutral-800 px-2 py-0.5 text-[11px]">FREE</span></div>
        <p className="mt-2 text-sm text-neutral-300">
          Sign in, redeem public offers when signed in, and upgrade any time for protection, early deals and rewards entries.
        </p>
        <button
          onClick={chooseFree}
          disabled={busy}
          className="mt-3 rounded border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm hover:bg-neutral-800 disabled:opacity-60"
        >
          Join free
        </button>
      </div>
    </Container>
  );
}