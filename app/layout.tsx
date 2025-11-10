// app/member/layout.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMe } from "@/lib/useMe";
import { useMeReady } from "@/lib/useMeReady";

type Tier = "access" | "member" | "pro";
type AppStatus = "free" | "trial" | "paid" | "inactive";

// Centralised check for “allowed into /member/*”
function isActivePaid(tier?: Tier, status?: AppStatus) {
  if (!tier || !status) return false;
  const paidTier = tier === "member" || tier === "pro";
  const okStatus = status === "paid" || status === "trial";
  return paidTier && okStatus;
}

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const me = useMe();
  const ready = useMeReady();

  const tier = (me?.tier as Tier | undefined) ?? "access";
  const status = me?.status as AppStatus | undefined;
  const allowed = isActivePaid(tier, status);

  useEffect(() => {
    if (!ready) return;
    if (!allowed) router.replace("/join?mode=signin");
  }, [ready, allowed, router]);

  if (!ready || !allowed) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 text-sm text-neutral-400">
        Checking your membership…
      </div>
    );
  }

  return <>{children}</>;
}