"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMe } from "@/lib/useMe";
import { useMeReady } from "@/lib/useMeReady";
import type { Me } from "@/lib/useMe";
import { isActivePaid } from "@/lib/trial"; // re-use the helper we added

type Tier = "access" | "member" | "pro";
type AppStatus = "free" | "trial" | "paid" | "inactive";

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const me: Me = useMe();
  const ready = useMeReady();

  const tier = (me?.tier as Tier) ?? "access";
  const status = me?.status as AppStatus | undefined;

  const ok = isActivePaid(tier, status);

  useEffect(() => {
    if (!ready) return;
    if (!ok) {
      // Not on an active paid plan → send to join/sign-in
      router.replace("/join?mode=signin");
    }
  }, [ready, ok, router]);

  // While we decide/redirect, avoid content flash
  if (!ready || !ok) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 text-sm text-neutral-400">
        Checking your membership…
      </div>
    );
  }

  return <>{children}</>;
}