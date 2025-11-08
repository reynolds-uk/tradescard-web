"use client";

import { useState } from "react";
import { useMe } from "@/lib/useMe";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://tradescard-api.vercel.app";

export function useJoinActions(next: string = "/welcome") {
  const me = useMe();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>("");

  async function startMembership(plan: "member" | "pro", opts?: { trial?: boolean }) {
    try {
      setBusy(true);
      setError("");
      if (!me?.user) {
        // Caller should have routed to /join with intent already
        window.location.href = "/join";
        return;
      }
      const res = await fetch(`${API_BASE}/api/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: me.user.id,
          email: me.email,
          plan,
          trial: !!opts?.trial,
          next,
        }),
        keepalive: true,
      });
      const json = await res.json().catch(() => ({} as { url?: string; error?: string }));
      if (!res.ok || !json?.url) throw new Error(json?.error || "Checkout failed");
      window.location.href = json.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setBusy(false);
    }
  }

  return { busy, error, startMembership };
}