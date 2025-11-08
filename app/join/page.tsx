// app/join/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import { useJoinModal } from "@/components/JoinModalContext";
import { useJoinActions } from "@/components/useJoinActions";

type Plan = "access" | "member" | "pro";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://tradescard-api.vercel.app";

const TRIAL_ACTIVE = process.env.NEXT_PUBLIC_TRIAL_ACTIVE === "true";
const TRIAL_COPY =
  process.env.NEXT_PUBLIC_TRIAL_COPY || "Try Member for £1 (90 days)";

export default function JoinPage() {
  // Supabase client
  const supabase = useMemo(
    () =>
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  // Minimal session presence
  const [hasSession, setHasSession] = useState<boolean>(false);
  useEffect(() => {
    let aborted = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!aborted) setHasSession(!!data?.session?.user);
    })();
    return () => {
      aborted = true;
    };
  }, [supabase]);

  // Join modal + actions
  const { openJoin } = useJoinModal(); // <-- this is a function, not a boolean
  const next = typeof window !== "undefined" ? window.location.pathname : "/join";
  const { startMembership, joinFree, busy, error } = useJoinActions(next);

  // Handlers
  const startPlan = async (plan: Exclude<Plan, "access">) => {
    if (!hasSession) {
      // not signed in → open modal preselected on the plan
      openJoin(plan);
      return;
    }
    // signed in → go straight to checkout
    await startMembership(plan);
  };

  const handleJoinFree = async () => {
    if (!hasSession) {
      openJoin("access");
      return;
    }
    await joinFree();
  };

  return (
    <Container>
      <PageHeader
        title="Join TradesCard"
        subtitle="Join free, or pick a plan with protection, early deals and monthly rewards. Switch or cancel any time."
        aside={
          <button
            onClick={() => openJoin("member")}
            className="rounded bg-neutral-800 hover:bg-neutral-700 px-3 py-2"
          >
            Sign in / Join
          </button>
        }
      />

      {TRIAL_ACTIVE && (
        <div className="mb-4 rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-200">
          Limited-time offer: {TRIAL_COPY}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded border border-red-600/40 bg-red-900/10 px-3 py-2 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Plans */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Member */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Member</h4>
            <span className="text-sm text-neutral-400">£2.99/mo</span>
          </div>
          <ul className="mt-3 space-y-1 text-sm text-neutral-300">
            <li>• Full offer access</li>
            <li>• Protect Lite benefits</li>
            <li>• Monthly prize entry</li>
            <li>• Digital card</li>
          </ul>
          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={() => startPlan("member")}
              disabled={busy}
              className="inline-block rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm hover:bg-neutral-800 disabled:opacity-60"
            >
              {busy ? "Opening…" : TRIAL_ACTIVE ? TRIAL_COPY : "Choose Member"}
            </button>
          </div>
        </div>

        {/* Pro */}
        <div className="relative rounded-2xl border border-amber-400/40 bg-amber-400/10 p-5 ring-1 ring-amber-400/30">
          <span className="absolute right-3 -top-2 rounded bg-neutral-800 text-[11px] px-2 py-0.5">
            Best value
          </span>
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Pro</h4>
            <span className="text-sm text-amber-300">£7.99/mo</span>
          </div>
          <ul className="mt-3 space-y-1 text-sm text-neutral-200">
            <li>• Everything in Member</li>
            <li>• Early-access deals & Pro-only offers</li>
            <li>• Double prize entries</li>
          </ul>
          <div className="mt-4">
            <button
              onClick={() => startPlan("pro")}
              disabled={busy}
              className="inline-block rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm hover:bg-neutral-800 disabled:opacity-60"
            >
              {busy ? "Opening…" : "Choose Pro"}
            </button>
          </div>
        </div>
      </div>

      {/* Access panel */}
      <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900/50 p-5">
        <div className="flex items-center gap-2">
          <h3 className="font-medium">Prefer to start free?</h3>
          <span className="rounded bg-neutral-800 px-2 py-0.5 text-xs">FREE</span>
        </div>
        <p className="text-sm text-neutral-400 mt-1">
          Join free, redeem offers when signed in, and upgrade any time for protection, early deals and rewards entries.
        </p>
        <div className="mt-3">
          <button
            onClick={handleJoinFree}
            disabled={busy}
            className="rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm hover:bg-neutral-800 disabled:opacity-60"
          >
            {busy ? "Starting…" : "Join free"}
          </button>
        </div>
      </div>

      <p className="mt-6 text-[12px] text-neutral-500">
        No purchase necessary. A free postal entry route is available on public promo pages. Paid and free routes are treated equally in draws.
      </p>
    </Container>
  );
}