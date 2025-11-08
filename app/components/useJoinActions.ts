// app/components/useJoinActions.ts
"use client";

import { useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

type Plan = "member" | "pro";

type StartOpts = {
  /** Where to return after checkout success */
  next?: string;
  /** Optional promo hint for the API → choose Stripe price */
  promo?: string | null;
};

export function useJoinActions(next: string = "/welcome") {
  const supabase = useMemo(
    () => createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ),
    []
  );

  // Feature flag: £1 for 90 days (set NEXT_PUBLIC_FEATURE_PROMO_1GBP=1)
  const isPromo = process.env.NEXT_PUBLIC_FEATURE_PROMO_1GBP === "1";
  const promoHint = isPromo ? "1gbp90d" : null;

  // Presentation (centralised so UI stays consistent)
  const memberPriceText = isPromo ? "£1 for 90 days, then £2.99/mo" : "£2.99/mo";
  const proPriceText    = isPromo ? "£1 for 90 days, then £7.99/mo" : "£7.99/mo";
  const memberCtaText   = isPromo ? "Choose Member – £1/90d" : "Choose Member";
  const proCtaText      = isPromo ? "Choose Pro – £1/90d"    : "Choose Pro";

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>("");

  async function currentUser() {
    const { data } = await supabase.auth.getSession();
    return data?.session?.user ?? null;
  }

  async function startMembership(plan: Plan, opts: StartOpts = {}) {
    try {
      setBusy(true);
      setError("");

      const user = await currentUser();
      if (!user) throw new Error("Not signed in");

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_BASE || "https://tradescard-api.vercel.app"}/api/checkout`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: user.id,
            email: user.email,
            plan,
            promo: opts.promo ?? promoHint,   // 👈 pass promo hint to API
            next:  opts.next  ?? next,         // 👈 optional post-checkout return
          }),
          keepalive: true,
        }
      );

      const json = await res.json().catch(() => ({} as { url?: string; error?: string }));
      if (!res.ok || !json.url) throw new Error(json?.error || "Checkout failed");
      window.location.href = json.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start checkout");
    } finally {
      setBusy(false);
    }
  }

  async function joinFree(opts: { next?: string } = {}) {
    // For free join, we simply bounce to /welcome (or provided `next`)
    window.location.href = opts.next ?? next;
  }

  return {
    isPromo,
    memberPriceText,
    proPriceText,
    memberCtaText,
    proCtaText,
    busy,
    error,
    startMembership,
    joinFree,
  };
}