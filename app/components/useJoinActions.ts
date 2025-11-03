// components/useJoinActions.ts
"use client";

import { useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://tradescard-api.vercel.app";

declare global {
  interface Window {
    tradescardFocusSignin?: () => void;
  }
}

type Plan = "member" | "pro";

export function useJoinActions(next?: string | null) {
  const supabase = useMemo(
    () => createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ),
    []
  );

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>("");

  const joinFree = () => {
    // Stash next so header magic-link can bounce back post-auth
    try {
      if (next) localStorage.setItem("tradescard_next_after_auth", next);
    } catch {}
    window.tradescardFocusSignin?.();
  };

  const startMembership = async (plan: Plan) => {
    try {
      setBusy(true);
      setError("");

      const { data } = await supabase.auth.getSession();
      const user = data?.session?.user ?? null;

      if (!user) {
        joinFree();
        return;
      }

      const res = await fetch(`${API_BASE}/api/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          email: user.email,
          plan,
          next: next || null,
        }),
        keepalive: true,
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.url) throw new Error(json?.error || "Checkout failed");
      window.location.href = json.url;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not start checkout";
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  return { busy, error, joinFree, startMembership };
}