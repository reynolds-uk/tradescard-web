// app/checkout/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Container from "@/components/Container";
import PrimaryButton from "@/components/PrimaryButton";
import { useMe } from "@/lib/useMe";
import { routeToJoin } from "@/lib/routeToJoin";
import { shouldShowTrial } from "@/lib/trial";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://tradescard-api.vercel.app";

export default function CheckoutPage() {
  const router = useRouter();
  const params = useSearchParams();

  const plan = (params.get("plan") || "member") as "member" | "pro";
  const billing = (params.get("billing") || "monthly") as "monthly" | "annual";
  const next = params.get("next") || "/welcome";

  const me = useMe();
  const signedIn = !!me?.user;
  const trial = shouldShowTrial(me); // hint for API to select intro price

  const [error, setError] = useState<string>("");
  const [started, setStarted] = useState(false);

  useEffect(() => {
    // If not signed in, route to /join with intent
    if (!me?.ready) return; // wait until auth state is known
    if (!signedIn) {
      routeToJoin(plan);
      return;
    }

    let aborted = false;

    async function go() {
      try {
        setError("");
        setStarted(true);

        const res = await fetch(`${API_BASE}/api/checkout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: me.user!.id,
            email: me.email,
            plan,
            billing,
            trial, // let API choose intro price if configured
            next,  // where to return after Stripe
          }),
          keepalive: true,
        });

        const json = (await res.json().catch(() => ({}))) as {
          url?: string;
          error?: string;
        };

        if (!res.ok || !json?.url) {
          throw new Error(json?.error || `Checkout failed (${res.status})`);
        }

        if (!aborted) window.location.href = json.url!;
      } catch (e) {
        if (!aborted)
          setError(e instanceof Error ? e.message : "Could not start checkout.");
      }
    }

    void go();
    return () => {
      aborted = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.ready, signedIn, plan, billing, next]);

  return (
    <Container>
      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6">
        <div className="text-lg font-semibold mb-2">Opening checkout…</div>
        <div className="text-sm text-neutral-400">
          {signedIn
            ? `Redirecting you to Stripe to complete your ${plan} plan (${billing} billing).`
            : "Checking your account and taking you to join first…"}
        </div>

        {error && (
          <div className="mt-3 rounded border border-red-600/40 bg-red-900/10 px-3 py-2 text-red-300">
            {error}
            {" — "}
            <button
              className="underline"
              onClick={() => router.replace(`/join?plan=${plan}`)}
            >
              go back
            </button>
            .
          </div>
        )}

        {!error && !started && (
          <div className="mt-3 text-sm text-neutral-500">
            Preparing your checkout session…
          </div>
        )}

        {error && (
          <div className="mt-4">
            <PrimaryButton onClick={() => router.replace(`/join?plan=${plan}`)}>
              Try again from Join
            </PrimaryButton>
          </div>
        )}
      </div>
    </Container>
  );
}