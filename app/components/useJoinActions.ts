"use client";

import { useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

type Billing = "monthly" | "annual";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://tradescard-api.vercel.app";

export function useJoinActions(next: string = "/") {
  const supabase = useMemo(
    () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!),
    []
  );

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function requireSession(): Promise<{ id: string; email: string } | null> {
    const { data } = await supabase.auth.getSession();
    const u = data?.session?.user ?? null;
    if (!u) return null;
    return { id: u.id, email: u.email ?? "" };
    }

  async function sendMagicLink() {
    const base = (process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "")) || window.location.origin;
    const stored = localStorage.getItem("tc:lastEmail");
    if (!stored) {
      setError("Enter your email in the header to receive a sign-in link.");
      return;
    }
    const { error } = await supabase.auth.signInWithOtp({
      email: stored,
      options: { emailRedirectTo: `${base}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (error) throw error;
  }

  async function startMembership(plan: "member" | "pro", billing: Billing = "monthly") {
    try {
      setBusy(true);
      setError("");

      const u = await requireSession();
      if (!u) {
        // nudge user to use the header field; we store email there
        await sendMagicLink();
        setError("Check your email for a sign-in link, then continue.");
        return;
      }

      const res = await fetch(`${API_BASE}/api/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: u.id,
          email: u.email,
          plan,
          billing,      // <-- NEW: tell the API monthly vs annual
          next,         // optional: where to return
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.url) throw new Error(json?.error || `Checkout failed (${res.status})`);
      window.location.href = json.url;
    } catch (e: any) {
      setError(e?.message ?? "Could not start checkout");
    } finally {
      setBusy(false);
    }
  }

  async function joinFree() {
    try {
      setBusy(true);
      setError("");

      const u = await requireSession();
      if (!u) {
        await sendMagicLink();
        setError("Check your email for a sign-in link and you’re in.");
        return;
      }

      // Already signed in → just go to offers
      window.location.href = "/offers";
    } catch (e: any) {
      setError(e?.message ?? "Could not start");
    } finally {
      setBusy(false);
    }
  }

  return { busy, error, startMembership, joinFree };
}