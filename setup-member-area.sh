#!/usr/bin/env bash
set -euo pipefail

echo "Scaffolding paid member area and promo components…"

mkdir -p app/member/benefits app/member/rewards
mkdir -p components
mkdir -p lib

# --- lib/entitlements.ts
cat > lib/entitlements.ts <<'TS'
export type Tier = "access" | "member" | "pro";

export function isPaidTier(tier?: string | null) {
  return tier === "member" || tier === "pro";
}

export function isActive(status?: string | null) {
  return status === "active" || status === "trialing";
}

export function isActivePaid(tier?: string | null, status?: string | null) {
  return isPaidTier(tier) && isActive(status);
}
TS

# --- app/member/layout.tsx
cat > app/member/layout.tsx <<'TSX'
"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMe } from "@/lib/useMe";
import { useMeReady } from "@/lib/useMeReady";
import Container from "@/components/Container";

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  const me = useMe();
  const ready = useMeReady();
  const router = useRouter();
  const isPaid = (me?.tier === "member" || me?.tier === "pro") &&
                 (me?.status === "active" || me?.status === "trialing");

  useEffect(() => {
    if (!ready) return;
    if (!isPaid) router.replace("/join?mode=signin");
  }, [ready, isPaid, router]);

  if (!ready || !isPaid) return null;
  return <Container>{children}</Container>;
}
TSX

# --- app/member/benefits/page.tsx
cat > app/member/benefits/page.tsx <<'TSX'
export default function MemberBenefitsPage() {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
      <h1 className="text-xl font-semibold mb-2">Benefits</h1>
      <p className="text-neutral-300 text-sm">
        Paid members see their full benefits here. (Placeholder — bring your real Benefits UI here.)
      </p>
    </div>
  );
}
TSX

# --- app/member/rewards/page.tsx
cat > app/member/rewards/page.tsx <<'TSX'
export default function MemberRewardsPage() {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
      <h1 className="text-xl font-semibold mb-2">Rewards</h1>
      <p className="text-neutral-300 text-sm">
        Paid members see their real rewards here. (Placeholder — add your Rewards UI here.)
      </p>
    </div>
  );
}
TSX

# --- components/PromoBenefits.tsx
cat > components/PromoBenefits.tsx <<'TSX'
"use client";
import PrimaryButton from "@/components/PrimaryButton";
import { routeToJoin } from "@/lib/routeToJoin";
import { shouldShowTrial, TRIAL_COPY } from "@/lib/trial";
import { useMe } from "@/lib/useMe";

export default function PromoBenefits() {
  const me = useMe();
  const trial = shouldShowTrial(me);
  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
      <h1 className="text-xl font-semibold">Benefits</h1>
      <p className="mt-2 text-neutral-300 text-sm">
        Upgrade your tradecard membership for built-in protection and support.
      </p>
      <ul className="mt-4 space-y-2 text-sm text-neutral-200">
        <li>• WeCare 24/7 wellbeing support</li>
        <li>• AA Lite roadside assistance (Pro)</li>
        <li>• Priority partner hotline (Pro)</li>
      </ul>
      <div className="mt-4">
        <PrimaryButton onClick={() => routeToJoin("member")}>
          {trial ? TRIAL_COPY : "Become a Member"}
        </PrimaryButton>
      </div>
    </section>
  );
}
TSX

# --- components/PromoRewards.tsx
cat > components/PromoRewards.tsx <<'TSX'
"use client";
import PrimaryButton from "@/components/PrimaryButton";
import { routeToJoin } from "@/lib/routeToJoin";
import { shouldShowTrial, TRIAL_COPY } from "@/lib/trial";
import { useMe } from "@/lib/useMe";

export default function PromoRewards() {
  const me = useMe();
  const trial = shouldShowTrial(me);
  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
      <h1 className="text-xl font-semibold">Rewards</h1>
      <p className="mt-2 text-neutral-300 text-sm">
        Upgrade your tradecard membership to unlock weekly and monthly prize entries.
      </p>
      <ul className="mt-4 space-y-2 text-sm text-neutral-200">
        <li>• Points become prize entries automatically</li>
        <li>• Member 1.25× boost • Pro 1.5× boost</li>
        <li>• More coming soon</li>
      </ul>
      <div className="mt-4">
        <PrimaryButton onClick={() => routeToJoin("member")}>
          {trial ? TRIAL_COPY : "Start with Member"}
        </PrimaryButton>
      </div>
    </section>
  );
}
TSX

echo "✅ Done — new member area and promo components created!"