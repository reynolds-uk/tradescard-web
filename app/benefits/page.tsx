// app/benefits/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import { useMe } from "@/lib/useMe";
import { useMeReady } from "@/lib/useMeReady";
import { routeToJoin } from "@/lib/routeToJoin";
import PromoBenefits from "@/components/promo/PromoBenefits";

type Tier = "access" | "member" | "pro";

export default function BenefitsPage() {
  const me = useMe();                 // { user?, tier?, status? }
  const ready = useMeReady();         // avoid auth flash
  const router = useRouter();

  const tier: Tier = (me?.tier as Tier) ?? "access";
  const isPaid =
    (tier === "member" || tier === "pro") &&
    (me?.status === "active" || me?.status === "trialing");

  // Paid users shouldn’t see promo — send to member experience
  useEffect(() => {
    if (ready && isPaid) router.replace("/member/benefits");
  }, [ready, isPaid, router]);

  // While we redirect, show a lightweight placeholder to avoid flicker
  if (ready && isPaid) {
    return (
      <Container>
        <PageHeader title="Benefits" subtitle="Taking you to your benefits…" />
      </Container>
    );
  }

  // Public promo (visitors & Access accounts)
  return (
    <PromoBenefits
      onJoin={() => routeToJoin("member")}
      onPro={() => routeToJoin("pro")}
    />
  );
}