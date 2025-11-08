// app/join/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  const params = useSearchParams();
  const me = useMe();
  const { user } = me;
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

  // subtle trial eligibility
  const showTrialChip = shouldShowTrial(me);

  // If already signed in, /join isn't needed → into the app
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user) router.replace("/offers");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle intent from ?plan=member|pro and localStorage fallback
  useEffect(() => {
    const qPlan = params?.get("plan") as Exclude<Plan, "access"> | null;
    const stored = (typeof window !== "undefined"
      ? window.localStorage.getItem("join_wanted_plan")
      : null) as Exclude<Plan, "access"> | null;

    const intent = qPlan || stored || null;
    if (!intent) return;

    if (user) {
      // already signed in → go straight to checkout
      void startMembership(intent);
    } else {
      // show inline email on the chosen card
      setWanted(intent);
      setInlineEmailFor(intent);
      if (qPlan && typeof window !== "undefined") {
        window.localStorage.setItem("join_wanted_plan", qPlan);
      }
      // focus email
      setTimeout(() => emailRef.current?.focus(), 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, user]);

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
      if (typeof window !== "undefined") {
        window.localStorage.setItem("join_wanted_plan", plan);
      }
      setTimeout(() => emailRef.current?.focus(), 0);
      return;
    }
    track(plan === "member" ? "join_member_click" : "join_pro_click", {
      trial: showTrialChip,
    });
    await startMembership(plan);
  }

  async function handleInlineEmailSend() {
    if (!inlineEmailFor) return;
    setInfo("");
    try {
      await sendMagicLink(email);
      setSent(true);
      setInfo(
        `Check your inbox for your sign-in link. We’ll continue to ${inlineEmailFor} after you sign in.`
      );
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

    return (
      <div
        className={`rounded-2xl border ${
          accent === "pro" ? "border-amber-400/30 ring-1 ring-amber-400/20" : "border-neutral-800"
        } bg-neutral-900 p-4`}
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
              ? showTrialChip
                ? TRIAL_COPY
                : "Choose Member"
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
          showTrialChip ? (
            <span className="promo-chip promo-chip-xs-hide">{TRIAL_COPY}</span>
          ) : undefined
        }
      />

      {info && (
        <div className="mb-4 alert alert-info">{info}</div>
      )}
      {error && (
        <div className="mb-4 alert alert-error">{error}</div>
      )}

      {/* Two plans */}
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