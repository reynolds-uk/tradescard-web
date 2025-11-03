// app/checkout/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import Container from "@/components/Container";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://tradescard-api.vercel.app";

export default function CheckoutPage() {
  const router = useRouter();
  const params = useSearchParams();
  const plan = (params.get("plan") || "member") as "member" | "pro";
  const billing = (params.get("billing") || "monthly") as "monthly" | "annual";

  const supabase = useMemo(
    () =>
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const [error, setError] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        // must be signed in to create checkout
        const { data } = await supabase.auth.getSession();
        const user = data?.session?.user ?? null;
        if (!user) {
          router.replace("/join");
          return;
        }

        // create Stripe Checkout session
        const res = await fetch(`${API_BASE}/api/checkout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: user.id,
            email: user.email,
            plan,
            billing,
            next: "/account",
          }),
        });

        const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };

        if (!res.ok || !json?.url) {
          throw new Error(json?.error || `Checkout failed (${res.status})`);
        }

        // send them to Stripe
        window.location.href = json.url!;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not start checkout.");
      }
    })();
  }, [supabase, plan, billing, router]);

  return (
    <Container>
      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
        <div className="text-lg font-semibold mb-2">Opening checkout…</div>
        <div className="text-sm text-neutral-400">
          Redirecting you to Stripe to complete your {plan} plan ({billing} billing).
        </div>
        {error && (
          <div className="mt-3 rounded border border-red-600/40 bg-red-900/10 px-3 py-2 text-red-300">
            {error} —{" "}
            <button className="underline" onClick={() => router.replace("/join")}>
              go back
            </button>
            .
          </div>
        )}
      </div>
    </Container>
  );
}