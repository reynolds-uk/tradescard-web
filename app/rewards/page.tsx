"use client";

import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import { useMe } from "@/lib/useMe";
import { useMeReady } from "@/lib/useMeReady";
import { routeToJoin } from "@/lib/routeToJoin";
import PromoRewards from "@/components/promo/PromoRewards";

type Tier = "access" | "member" | "pro";

export default function RewardsPage() {
  const me = useMe();                // { user?, tier?, status? }
  const ready = useMeReady();

  const tier: Tier = (me?.tier as Tier) ?? "access";
  const isPaidTier = tier === "member" || tier === "pro";
  const isActivePaid = isPaidTier && (me?.status === "active" || me?.status === "trialing");

  // Promo surface for visitors & Access (and while auth is unknown)
  if (!ready || !isActivePaid) {
    return (
      <Container>
        <PageHeader
          title="Rewards"
          subtitle="Points become entries for weekly and monthly draws."
        />
        <PromoRewards
          onJoin={() => routeToJoin("member")}
          onPro={() => routeToJoin("pro")}
        />
      </Container>
    );
  }

  // Paid & active → real rewards stats
  return (
    <Container>
      <PageHeader
        title="Rewards"
        subtitle="Earn points every month you’re a paid member. Your tier boosts points; points become entries for weekly and monthly draws."
        aside={
          <div className="text-xs rounded bg-neutral-900 border border-neutral-800 px-2 py-1">
            {tier.toUpperCase()} • {me?.status}
          </div>
        }
      />

      {/* Replace with your live stats component; this is a simple placeholder */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <div className="text-sm text-neutral-400">Points this month (base)</div>
          <div className="mt-2 text-3xl font-semibold">—</div>
        </div>
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <div className="text-sm text-neutral-400">Tier boost</div>
          <div className="mt-2 text-3xl font-semibold">
            {tier === "pro" ? "1.5×" : "1.25×"}
          </div>
        </div>
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <div className="text-sm text-neutral-400">Entries this month</div>
          <div className="mt-2 text-3xl font-semibold">—</div>
        </div>
      </div>
    </Container>
  );
}