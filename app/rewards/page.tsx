// app/rewards/page.tsx
"use client";

import { useMemo } from "react";
import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import { useMe } from "@/lib/useMe";
import { useMeReady } from "@/lib/useMeReady";
import { routeToJoin } from "@/lib/routeToJoin";
import { shouldShowTrial, TRIAL_COPY } from "@/lib/trial";
import PromoRewards from "@/components/promo/PromoRewards";

type Tier = "access" | "member" | "pro";

export default function RewardsPage() {
  const me = useMe();                 // { user?, tier?, status? }
  const ready = useMeReady();
  const tier: Tier = (me?.tier as Tier) ?? "access";
  const isPaid = (tier === "member" || tier === "pro") &&
                 (me?.status === "active" || me?.status === "trialing");

  const showTrial = shouldShowTrial(me);

  // Paid subtitle
  const subtitle = useMemo(() => {
    if (!ready) return "Loading…";
    if (isPaid) return "Earn points every month you’re a paid member. Points become draw entries.";
    return "Join as a paid member to start earning points and entries.";
  }, [ready, isPaid]);

  // non-paid = promo
  if (ready && !isPaid) {
    return (
      <PromoRewards
        onJoin={() => routeToJoin("member")}
        onPro={() => routeToJoin("pro")}
        trialCopy={showTrial ? TRIAL_COPY : undefined}
      />
    );
  }

  // Paid member/pro view (simple, safe defaults; wire to real data later)
  const tierBoost = tier === "pro" ? "1.5×" : "1.25×";

  return (
    <Container>
      <PageHeader title="Rewards" subtitle={subtitle} />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
          <div className="text-xs text-neutral-400 mb-1">Points this month (base)</div>
          <div className="text-2xl font-semibold">—</div>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
          <div className="text-xs text-neutral-400 mb-1">Tier boost</div>
          <div className="text-2xl font-semibold">{tierBoost}</div>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
          <div className="text-xs text-neutral-400 mb-1">Entries this month</div>
          <div className="text-2xl font-semibold">—</div>
        </div>
      </div>

      {/* Pro nudge (only for Member) */}
      {tier === "member" && (
        <div className="mt-6 flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
          <div className="text-sm text-neutral-300">
            Go Pro for a bigger monthly boost and early-access deals.
          </div>
          <button
            onClick={() => routeToJoin("pro")}
            className="rounded-xl bg-amber-500 px-3 py-1.5 text-sm font-medium text-neutral-900 hover:bg-amber-400"
          >
            Upgrade to Pro
          </button>
        </div>
      )}
    </Container>
  );
}