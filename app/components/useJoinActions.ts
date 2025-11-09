// app/components/useJoinActions.ts
"use client";

import { useMemo, useState } from "react";
import { useMe } from "@/lib/useMe";
import { shouldShowTrial } from "@/lib/trial";

type Plan = "member" | "pro";
type Interval = "month" | "year";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://tradescard-api.vercel.app";

/**
 * Helper for join/checkout flows.
 * Returns busy/error state and a startMembership() that:
 *  - Redirects logged-out users to /join with intent stored
 *  - Calls /api/checkout for logged-in users (monthly/yearly + optional trial)
 */
export function useJoinActions(next: string = "/welcome") {
  const me = useMe();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // precompute default trial flag based on current user/tier
  const defaultTrial = useMemo(() => shouldShowTrial(me), [me]);

  async function startMembership(
    plan: Plan,
    interval: Interval = "month",
    opts?: { trial?: boolean }
  ) {
    try {
      setBusy(true);
      setError("");

      // Not signed in → stash intent and bounce to /join
      if (!me?.user) {
        try {
          window.localStorage.setItem("join_wanted_plan", plan);
        } catch {
          /* no-op */
        }
        const url = new URL("/join", window.location.origin);
        url.searchParams.set("plan", plan);
        window.location.href = url.toString();
        return;
      }

      // Logged in → hit checkout API
      const res = await fetch(`${API_BASE}/api/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: me.user.id,
          email: me.email,
          plan,
          interval,              // "month" | "year"
          trial: opts?.trial ?? defaultTrial,
          next,                  // where to return after checkout
        }),
        keepalive: true,
      });

      const json = await res.json().catch(() => ({} as { url?: string; error?: string }));
      if (!res.ok || !json.url) throw new Error(json?.error || "Checkout failed");
      window.location.href = json.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start checkout");
    } finally {
      setBusy(false);
    }
  }

  return { busy, error, startMembership };
}