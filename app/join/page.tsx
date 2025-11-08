// app/join/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import PrimaryButton from "@/components/PrimaryButton";
import { useMe } from "@/lib/useMe";
import { useJoinActions } from "@/components/useJoinActions";
import { shouldShowTrial, TRIAL_COPY } from "@/lib/trial";
import { track } from "@/lib/track";

type Plan = "access" | "member" | "pro";

export default function JoinPage() {
  const router = useRouter();
  const me = useMe();
  const { user, tier, status, ready } = me;
  const next = "/join";
  const { busy, error, startMembership } = useJoinActions(next);

  // local state
  const [email, setEmail] = useState("");
  const [info, setInfo] = useState<string>("");
  const [sent, setSent] = useState(false);
  const [wanted, setWanted] = useState<Plan | null>(null);
  const [inlineEmailFor, setInlineEmailFor] = useState<Plan | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  // Supabase client (client-side auth flow)
  const supabase = useMemo(
    () =>
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  // If the visitor is already logged in, take them into the app
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user) router.replace("/offers");
    })();
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show trial banner only when eligible
  const showTrialBanner = shouldShowTrial(me);

  // If we asked the user to sign in for a plan, remember it and auto-continue after they return
  useEffect(() => {
    const stored = window.localStorage.getItem("join_wanted_plan") as Plan | null;
    if (user && stored && stored !== "access") {
      window.localStorage.removeItem("join_wanted_plan");
      void startMembership(stored);
    }
  }, [user, startMembership]);

  async function sendMagicLink(targetEmail: string) {
    const trimmed = targetEmail.trim();
    if (!trimmed || !/^\S+@\S+\.\S+$/.test(trimmed)) {
      setInfo("Enter a valid email to get your sign-in link.");
      emailRef.current?.focus();
      return;
    }

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ?? "https://tradescard-web.vercel.app";

    const { error: supaErr } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { emailRedirectTo: new URL("/offers", appUrl).toString() },
    });

    if (supaErr) throw supaErr;
  }

  async function handleSendLink() {
    setInfo("");
    try {
      await sendMagicLink(email);
      setSent(true);
      setInfo("Check your inbox for your sign-in link.");
      track("join_free_click");
    } catch {
      setInfo("We couldn't send the link just now. Please try again.");
    }
  }

  async function choose(plan: Exclude<Plan, "access">) {
    setInfo("");
    if (!user) {
      // No account yet → keep everything inline on the chosen card
      setWanted(plan);
      setInlineEmailFor(plan);
      window.localStorage.setItem("join_wanted_plan", plan);
      // visual focus
      setTimeout(() => emailRef.current?.focus(), 0);
      return;
    }
    track(plan === "member" ? "join_member_click" : "join_pro_click", {
      // informative, not a feature flag any more (logic lives in shouldShowTrial)
      trial: showTrialBanner,
    });
    await startMembership(plan);
  }

  async function handleInlineEmailSend() {
    if (!inlineEmailFor) return;
    setInfo("");
    try {
      await sendMagicLink(email);
      setSent(true);
      setInfo(`Check your inbox for your sign-in link. We’ll continue to ${inlineEmailFor} after you sign in.`);
      track("join_free_click");
    } catch {
      setInfo("We couldn't send the link just now. Please try again.");
    }
  }

  /* -------------------------
     UI helpers
  --------------------------*/
  function PlanCard({
    plan,
    title,
    price,
    features,
    accent,
  }: {
    plan: Exclude<Plan, "access">;
    title: string;
    price: string;
    features: string[];
    accent?: "pro" | "member";
  }) {
    const isInline = inlineEmailFor === plan;
    const borderAccent =
      accent === "pro" ? "border-amber-400/30" : "border-neutral-800";

    return (
      <div
        className={`rounded-2xl border ${borderAccent} bg-neutral-900 p-4`}
      >
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold">{title}</div>
          <div className="text-sm text-neutral-300">{price}</div>
        </div>

        <ul className="mt-2 space-y-1 text-sm text-neutral-300">
          {features.map((f) => (
            <li key={f}>• {f}</li>
          ))}
        </ul>

        {!isInline ? (
          <PrimaryButton
            onClick={() => choose(plan)}
            disabled={busy}
            className="mt-4 w-full"
          >
            {plan === "member"
              ? (showTrialBanner ? TRIAL_COPY : "Become a Member")
              : "Choose Pro"}
          </PrimaryButton>
        ) : (
          <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
            <input
              ref={emailRef}
              type="email"
              inputMode="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
            />
            <PrimaryButton onClick={handleInlineEmailSend} disabled={busy}>
              {sent ? "Link sent ✓" : "Send sign-in link"}
            </PrimaryButton>
            <p className="col-span-full text-xs text-neutral-500">
              We’ll continue to <strong>{plan}</strong> after you sign in.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <Container>
      <PageHeader
        title="Join TradesCard"
        subtitle="Start free, or pick a plan with protection, early deals and monthly rewards. Switch or cancel any time."
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
        <PlanCard
          plan="member"
          title="Member"
          price="£2.99/mo"
          features={[
            "Full offer access",
            "Protect Lite benefits",
            "Monthly prize entry",
            "Digital card",
          ]}
          accent="member"
        />
        <PlanCard
          plan="pro"
          title="Pro"
          price="£7.99/mo"
          features={[
            "Everything in Member",
            "Early-access deals & Pro-only offers",
            "Double prize entries",
          ]}
          accent="pro"
        />
      </div>

      {/* Join free strip (kept for people who just want Access) */}
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
            <PrimaryButton onClick={handleSendLink} disabled={busy} className="text-sm">
              {sent ? "Link sent ✓" : "Join free"}
            </PrimaryButton>
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