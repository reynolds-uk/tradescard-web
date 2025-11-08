// app/join/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import { useMe } from "@/lib/useMe";
import { useJoinActions } from "@/components/useJoinActions";
import { track } from "@/lib/track";

type Plan = "access" | "member" | "pro";

const TRIAL_ACTIVE = process.env.NEXT_PUBLIC_TRIAL_ACTIVE === "true";
const TRIAL_COPY =
  process.env.NEXT_PUBLIC_TRIAL_COPY || "Try Member for £1 (90 days)";

export default function JoinPage() {
  const { user, tier, status, ready } = useMe();
  const next = "/join";
  const { busy, error, joinFree, startMembership } = useJoinActions(next);

  const [email, setEmail] = useState("");
  const [info, setInfo] = useState<string>("");
  const [sent, setSent] = useState(false);
  const [wanted, setWanted] = useState<Plan | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  // Hide the trial banner for active Member/Pro
  const showTrialBanner = TRIAL_ACTIVE
    ? !(ready && user && status === "active" && (tier === "member" || tier === "pro"))
    : false;

  // If we asked the user to sign in for a plan, remember it and auto-continue after they return
  useEffect(() => {
    const stored = window.localStorage.getItem("join_wanted_plan") as Plan | null;
    if (user && stored && stored !== "access") {
      window.localStorage.removeItem("join_wanted_plan");
      // fire and forget; UI will be driven by Stripe redirect
      void startMembership(stored);
    }
  }, [user, startMembership]);

  async function handleSendLink() {
    setInfo("");
    const trimmed = email.trim();
    if (!trimmed || !/^\S+@\S+\.\S+$/.test(trimmed)) {
      setInfo("Enter a valid email to get your sign-in link.");
      emailRef.current?.focus();
      return;
    }
    try {
      await joinFree(trimmed);
      setSent(true);
      setInfo("Check your inbox for your sign-in link.");
      track("join_free_click");
    } catch {
      // joinActions already exposes an error string; nothing extra here
    }
  }

  async function choose(plan: Exclude<Plan, "access">) {
    setInfo("");
    if (!user) {
      // ask for email first, store intent, and guide the user
      setWanted(plan);
      window.localStorage.setItem("join_wanted_plan", plan);
      setInfo("Not signed in — enter your email to get a sign-in link, then we’ll continue.");
      emailRef.current?.focus();
      return;
    }
    track(plan === "member" ? "join_member_click" : "join_pro_click", {
      trial: TRIAL_ACTIVE,
    });
    await startMembership(plan);
  }

  return (
    <Container>
      <PageHeader
        title="Join TradesCard"
        subtitle="Join free, or pick a plan with protection, early deals and monthly rewards. Switch or cancel any time."
        aside={
          showTrialBanner ? (
            <span className="hidden sm:inline rounded bg-amber-400/20 text-amber-200 text-xs px-2 py-1 border border-amber-400/30">
              {TRIAL_COPY}
            </span>
          ) : undefined
        }
      />

      {info && (
        <div className="mb-4 rounded border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-amber-200 text-sm">
          {info}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded border border-red-600/40 bg-red-900/10 px-3 py-2 text-red-300 text-sm">
          {error}
        </div>
      )}

      {showTrialBanner && (
        <div className="mb-4 rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-200">
          Limited-time offer: {TRIAL_COPY}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Member card */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
          <div className="flex items-center justify-between">
            <div className="text-lg font-semibold">Member</div>
            <div className="text-sm text-neutral-300">£2.99/mo</div>
          </div>
          <ul className="mt-2 space-y-1 text-sm text-neutral-300">
            <li>• Full offer access</li>
            <li>• Protect Lite benefits</li>
            <li>• Monthly prize entry</li>
            <li>• Digital card</li>
          </ul>
          <button
            onClick={() => choose("member")}
            disabled={busy}
            className="mt-4 w-full rounded bg-amber-400 px-4 py-2 font-medium text-black hover:opacity-90 disabled:opacity-50"
          >
            {TRIAL_ACTIVE ? TRIAL_COPY : "Become a Member"}
          </button>
        </div>

        {/* Pro card */}
        <div className="rounded-2xl border border-amber-400/30 bg-neutral-900 p-4">
          <div className="flex items-center justify-between">
            <div className="text-lg font-semibold">Pro</div>
            <div className="text-sm text-neutral-300">£7.99/mo</div>
          </div>
          <ul className="mt-2 space-y-1 text-sm text-neutral-300">
            <li>• Everything in Member</li>
            <li>• Early-access deals & Pro-only offers</li>
            <li>• Double prize entries</li>
          </ul>
          <button
            onClick={() => choose("pro")}
            disabled={busy}
            className="mt-4 w-full rounded border border-neutral-700 bg-neutral-900 px-4 py-2 hover:bg-neutral-800 disabled:opacity-50"
          >
            Choose Pro
          </button>
        </div>
      </div>

      {/* Join free */}
      <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-neutral-300">
            Prefer to start free? Sign in to browse and redeem offers. Upgrade any time.
          </div>
          <div className="flex w-full flex-col items-stretch gap-2 md:w-auto md:flex-row">
            <input
              ref={emailRef}
              type="email"
              inputMode="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 md:w-64"
            />
            <button
              onClick={handleSendLink}
              disabled={busy}
              className="rounded bg-neutral-200 px-3 py-2 text-sm font-medium text-black hover:bg-white disabled:opacity-50"
            >
              {sent ? "Link sent ✓" : "Join free"}
            </button>
          </div>
        </div>
        <div className="mt-2 text-xs text-neutral-500">
          Cancel any time • Secure checkout • You’ll return to /join
          {wanted && (
            <span className="ml-2 text-neutral-400">
              (We’ll continue to <strong>{wanted}</strong> after you sign in)
            </span>
          )}
        </div>
      </div>
    </Container>
  );
}