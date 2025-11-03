"use client";

import { useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

export type Billing = "monthly" | "annual";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://tradescard-api.vercel.app";

export function useJoinActions(next: string = "/") {
  const supabase = useMemo(
    () =>
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  async function requireSession(): Promise<{ id: string; email: string } | null> {
    const { data } = await supabase.auth.getSession();
    const u = data?.session?.user ?? null;
    if (!u) return null;
    return { id: u.id, email: u.email ?? "" };
  }

  async function sendMagicLink(): Promise<void> {
    const base =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
      window.location.origin;
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

  async function startMembership(plan: "member" | "pro", billing: Billing = "monthly"): Promise<void> {
    try {
      setBusy(true);
      setError("");

      const u = await requireSession();
      if (!u) {
        await sendMagicLink();
        setError("Check your email for a sign-in link, then continue.");
        return;
      }

      const res = await fetch(`${API_BASE}/api/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: u.id, email: u.email, plan, billing, next }),
      });

      const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !json?.url) throw new Error(json?.error || `Checkout failed (${res.status})`);
      window.location.href = json.url;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not start checkout";
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  async function joinFree(): Promise<void> {
    try {
      setBusy(true);
      setError("");

      const u = await requireSession();
      if (!u) {
        await sendMagicLink();
        setError("Check your email for a sign-in link and you’re in.");
        return;
      }

      window.location.href = "/offers";
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not start";
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  return { busy, error, startMembership, joinFree };
}