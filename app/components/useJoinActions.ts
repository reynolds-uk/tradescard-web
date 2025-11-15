// app/components/useJoinActions.ts
"use client";

import { useCallback, useState } from "react";
import { useMe } from "@/lib/useMe";
import { useMeReady } from "@/lib/useMeReady";
import { routeToJoin } from "@/lib/routeToJoin";
import { API_BASE } from "@/lib/config";

type Cycle = "month" | "year";
type Plan = "member" | "pro";

export function useJoinActions(source: string = "/join") {
  const me = useMe();
  const ready = useMeReady();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>("");

  const startMembership = useCallback(
    async (plan: Plan, cycle: Cycle, opts?: { trial?: boolean; next?: string }) => {
      setError("");

      // Wait for auth to be known
      if (!ready) {
        setError("Checking your account…");
        return;
      }

      // If not signed in, bounce to /join flow (open inline email there)
      if (!me?.user || !me?.email) {
        routeToJoin(plan); // preserves intent in the UI
        return;
      }

      try {
        setBusy(true);

        const res = await fetch(`/api/checkout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: me.user.id,
            email: me.email,
            plan,
            billing: cycle === "year" ? "annual" : "monthly",
            trial: !!opts?.trial,
            next: opts?.next || "/welcome",
            source, // diagnostic only
          }),
          keepalive: true,
        });

        const json = (await res.json().catch(() => ({}))) as {
          url?: string;
          error?: string;
          upstream?: { error?: string; [key: string]: any };
        };

        if (!res.ok || !json?.url) {
          const upstreamMsg = json?.upstream?.error;
          const message = json?.error || upstreamMsg || `Checkout failed (${res.status})`;
          throw new Error(message);
        }

        window.location.href = json.url!;
      } catch (e: any) {
        setError(e?.message || "Couldn’t open checkout.");
      } finally {
        setBusy(false);
      }
    },
    [ready, me?.user, me?.email, source]
  );

  return { busy, error, startMembership };
}
