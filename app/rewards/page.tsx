// app/rewards/page.tsx
"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();

  const tier: Tier = (me?.tier as Tier) ?? "access";
  const isPaid =
    (tier === "member" || tier === "pro") &&
    (me?.status === "active" || me?.status === "trialing");

  const showTrial = shouldShowTrial(me);

  // If paid, send to the member experience
  useEffect(() => {
    if (ready && isPaid) router.replace("/member/rewards");
  }, [ready, isPaid, router]);

  // Subtitle used while loading (or for SEO crawl)
  const subtitle = useMemo(() => {
    if (!ready) return "Loading…";
    return "Join as a paid member to start earning points and entries.";
  }, [ready]);

  // While we decide/redirect, show nothing heavy to avoid flicker
  if (ready && isPaid) {
    return (
      <Container>
        <PageHeader title="Rewards" subtitle="Taking you to your rewards…" />
      </Container>
    );
  }

  // Public promo (non-paid)
  return (
    <PromoRewards
      onJoin={() => routeToJoin("member")}
      onPro={() => routeToJoin("pro")}
      trialCopy={showTrial ? TRIAL_COPY : undefined}
      // Optional: a11y/seo fallback heading if needed by your Promo component
      // heading="Rewards"
      // subtitle={subtitle}
    />
  );
}