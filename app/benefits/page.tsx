"use client";

import { useMemo } from "react";
import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import PrimaryButton from "@/components/PrimaryButton";
import { useMe } from "@/lib/useMe";
import { useMeReady } from "@/lib/useMeReady";
import { routeToJoin } from "@/lib/routeToJoin";
import PromoBenefits from "@/components/promo/PromoBenefits";

type Tier = "access" | "member" | "pro";

export default function BenefitsPage() {
  const me = useMe();                 // { user?, tier?, status? }
  const ready = useMeReady();         // avoid auth flash

  const tier: Tier = (me?.tier as Tier) ?? "access";
  const isPaidTier = tier === "member" || tier === "pro";
  const isActivePaid = isPaidTier && (me?.status === "active" || me?.status === "trialing");

  // While auth is unknown, just hold the skeleton via PromoBenefits' loading state
  if (!ready || !isActivePaid) {
    return (
      <Container>
        <PageHeader
          title="Benefits"
          subtitle="Built-in protection and support for paid members."
        />
        {/* Promo surface for visitors & Access accounts */}
        <PromoBenefits
          onJoin={() => routeToJoin("member")}
          onPro={() => routeToJoin("pro")}
        />
      </Container>
    );
  }

  // Paid & active → full member area
  return (
    <Container>
      <PageHeader
        title="Benefits"
        subtitle="Your membership includes the benefits below. Upgrade to unlock more."
        aside={
          <div className="text-xs rounded bg-neutral-900 border border-neutral-800 px-2 py-1">
            {tier.toUpperCase()} • {me?.status}
          </div>
        }
      />

      {/* Example member tiles — replace with your real benefits grid or reuse your previous componentry */}
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
          <div className="text-sm text-neutral-400 mb-1">Included</div>
          <div className="font-semibold">Protect Lite</div>
          <p className="mt-1 text-sm text-neutral-400">
            Purchase protection and dispute help on eligible redemptions.
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
          <div className="text-sm text-neutral-400 mb-1">Included</div>
          <div className="font-semibold">Priority Support</div>
          <p className="mt-1 text-sm text-neutral-400">
            Faster help when you need us most.
          </p>
        </div>

        {/* Pro-only teaser inside paid view */}
        {tier === "member" && (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-950/60 p-5">
            <div className="text-sm text-neutral-400 mb-1">Pro only</div>
            <div className="font-semibold">Early-access deals</div>
            <p className="mt-1 text-sm text-neutral-400">
              Get first dibs on limited-quantity offers.
            </p>
            <div className="mt-3">
              <PrimaryButton onClick={() => routeToJoin("pro")}>
                Upgrade to Pro
              </PrimaryButton>
            </div>
          </div>
        )}
      </section>
    </Container>
  );
}