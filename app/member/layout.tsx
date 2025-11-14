// app/member/layout.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMe } from "@/lib/useMe";
import { useMeReady } from "@/lib/useMeReady";
import Container from "@/components/Container";
import {
  type Tier,
  type AppStatus,
  isPaidTier,
  isActiveStatus,
} from "@/lib/subscription";

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  const me = useMe();
  const ready = useMeReady();
  const router = useRouter();

  const tier = me?.tier as Tier | undefined;
  const status = me?.status as AppStatus | undefined;
  const allowed = isPaidTier(tier) && isActiveStatus(status);

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

  return <Container>{children}</Container>;
}
