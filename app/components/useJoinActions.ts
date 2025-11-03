"use client";

import { useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

export type Billing = "monthly" | "annual";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://tradescard-api.vercel.app";

type SessionUser = { id: string; email: string };

type CheckoutResponse = {
  url?: string;
  error?: string;
};

function getSiteOrigin(): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (env) return env;
  if (typeof window !== "undefined") return window.location.origin;
  return ""; // SSR fallback (won’t be used client-side)
}

export function useJoinActions(next: string = "/") {
  const supabase = useMemo(
    () =>
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function requireSession(): Promise<SessionUser | null> {
    const { data } = await supabase.auth.getSession();
    const u = data?.session?.user ?? null;
    if (!u) return null;
    return { id: u.id, email: u.email ?? "" };
    }

  /**
   * Try to send a magic link using the last stored email (saved by the modal/header).
   * Returns true if we attempted to send; false if no email was available.
   * Intentionally does NOT set an error on success — the modal handles user messaging.
   */
  async function sendMagicLinkIfEmailSaved(): Promise<boolean> {
    if (typeof window === "undefined") return false;
    const saved = localStorage.getItem("tc:lastEmail");
    if (!saved) return false;

    const base = getSiteOrigin();
    const { error } = await supabase.auth.signInWithOtp({
      email: saved,
      options: { emailRedirectTo: `${base}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (error) {
      // This is a real failure we should surface.
      setError(error.message || "Failed to send sign-in link.");
    }
    return true;
  }

  async function startMembership(
    plan: "member" | "pro",
    billing: Billing = "monthly"
  ): Promise<void> {
    try {
      setBusy(true);
      setError("");

      const u = await requireSession();
      if (!u) {
        // Not signed in: best effort to send link (modal will show UI messages)
        await sendMagicLinkIfEmailSaved();
        return;
      }

      const res = await fetch(`${API_BASE}/api/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: u.id, email: u.email, plan, billing, next }),
      });

      const json = (await res.json().catch(() => ({}))) as CheckoutResponse;
      if (!res.ok || !json.url) {
        throw new Error(json.error || `Checkout failed (${res.status})`);
      }
      window.location.href = json.url;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not start checkout.";
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
        // Not signed in: best effort to send link (modal will show UI messages)
        await sendMagicLinkIfEmailSaved();
        return;
      }

      // Signed in → just continue to public catalogue (or member area if you prefer)
      window.location.href = "/offers";
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not continue.";
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  return { busy, error, startMembership, joinFree };
}