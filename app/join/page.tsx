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
type Cadence = "month" | "year";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://tradescard-web.vercel.app";

const AUTH_ERROR_MAP: Record<string, string> = {
  otp_expired: "That sign-in link has expired. Please request a new one.",
  otp_disabled: "Magic links are currently unavailable. Please try again shortly.",
  invalid_grant: "That sign-in link is no longer valid. Request a new one.",
  server_error: "We had trouble verifying your link. Try again.",
};

export default function JoinPage() {
  const router = useRouter();
  const params = useSearchParams();

  const me = useMe();
  const { user } = me;

  // Paid funnel / checkout helper
  const { busy, error: checkoutError, startMembership } = useJoinActions("/join");

  // UI state
  const [tab, setTab] = useState<"join" | "signin">("join");
  const [cadence, setCadence] = useState<Cadence>("month");
  const [email, setEmail] = useState("");
  const [info, setInfo] = useState<string>("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [wanted, setWanted] = useState<Exclude<Plan, "access"> | null>(null);
  const [inlineEmailFor, setInlineEmailFor] =
    useState<Exclude<Plan, "access"> | null>(null);

  // Separate refs for each capture surface (prevents focus churn)
  const memberEmailRef = useRef<HTMLInputElement>(null);
  const proEmailRef = useRef<HTMLInputElement>(null);
  const freeEmailRef = useRef<HTMLInputElement>(null);
  const signinEmailRef = useRef<HTMLInputElement>(null);

  // Supabase client (client-side auth flow)
  const supabase = useMemo(
    () =>
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const showTrialChip = shouldShowTrial(me);

  // Default tab, cadence & intent from query string
  useEffect(() => {
    const mode = (params.get("mode") || "").toLowerCase();
    const qPlan = params.get("plan") as Exclude<Plan, "access"> | null;
    const qCad = (params.get("cadence") as Cadence) || undefined;

    if (mode === "signin") setTab("signin");
    if (qPlan) setWanted(qPlan);
    if (qCad === "year") setCadence("year");
  }, [params]);

  // Handle auth redirect errors
  useEffect(() => {
    const err = params.get("error") || params.get("error_code");
    if (!err) return;
    const key = (err || "").toLowerCase();
    const msg =
      AUTH_ERROR_MAP[key] || "We couldn’t verify your link. Please request a new one.";
    setTab("signin");
    setInfo(msg);
    try {
      const url = new URL(window.location.href);
      ["error", "error_code", "error_description", "status", "success", "canceled"].forEach(
        (k) => url.searchParams.delete(k)
      );
      window.history.replaceState({}, "", url.pathname);
    } catch {}
  }, [params]);

  // If already signed in, /join isn’t needed → take them to offers (or continue checkout)
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user) {
        const stored = window.localStorage.getItem("join_wanted_plan") as
          | Exclude<Plan, "access">
          | null;
        if (stored) {
          window.localStorage.removeItem("join_wanted_plan");
          await startMembership(stored);
          return;
        }
        router.replace("/offers");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If no account and there’s a plan intent, inline the email capture on that card
  useEffect(() => {
    const stored = (typeof window !== "undefined"
      ? window.localStorage.getItem("join_wanted_plan")
      : null) as Exclude<Plan, "access"> | null;

    const plan = wanted || stored || null;
    if (!plan || user) return;

    setInlineEmailFor(plan);
  }, [user, wanted]);

  // Focus the correct inline box when it appears
  useEffect(() => {
    if (!inlineEmailFor) return;
    const ref = inlineEmailFor === "member" ? memberEmailRef : proEmailRef;
    ref.current?.focus();
  }, [inlineEmailFor]);

  function isValidEmail(v: string) {
    return /^\S+@\S+\.\S+$/.test(v.trim());
  }

  async function sendMagicLink(targetEmail: string, redirectTo = "/offers") {
    const trimmed = targetEmail.trim();
    if (!trimmed || !isValidEmail(trimmed)) {
      setInfo("Enter a valid email to get your sign-in link.");
      return Promise.reject(new Error("invalid_email"));
    }
    const { error: supaErr } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { emailRedirectTo: new URL(redirectTo, APP_URL).toString() },
    });
    if (supaErr) throw supaErr;
  }

  async function handleFreeJoin() {
    setInfo("");
    try {
      setSending(true);
      await sendMagicLink(email, "/offers");
      setSent(true);
      setInfo("Check your inbox for your sign-in link.");
      track("join_free_click");
    } catch (e) {
      if ((e as Error)?.message !== "invalid_email") {
        setInfo("We couldn’t send the link just now. Please try again.");
      }
    } finally {
      setSending(false);
    }
  }

  async function choose(plan: Exclude<Plan, "access">) {
    setInfo("");
    if (!user) {
      // Logged out → store intent and inline email on chosen card
      setWanted(plan);
      setInlineEmailFor(plan);
      try {
        window.localStorage.setItem("join_wanted_plan", plan);
      } catch {}
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
      setSending(true);
      await sendMagicLink(email, "/join"); // come back to /join and continue checkout
      setSent(true);
      setInfo(`Link sent. After you sign in, we’ll continue to ${inlineEmailFor}.`);
      track("join_free_click");
    } catch (e) {
      if ((e as Error)?.message !== "invalid_email") {
        setInfo("We couldn’t send the link just now. Please try again.");
      }
    } finally {
      setSending(false);
    }
  }

  const onEnter = (fn: () => void) => (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      fn();
    }
  };

  /* -------------------------
     UI helpers
  --------------------------*/
  function PlanCard({
    plan,
    title,
    monthlyPrice,
    yearlyPrice,
    features,
    accent,
    inputRef,
  }: {
    plan: Exclude<Plan, "access">;
    title: string;
    monthlyPrice: string;
    yearlyPrice: string;
    features: string[];
    accent?: "pro" | "member";
    inputRef: React.RefObject<HTMLInputElement>;
  }) {
    const isInline = inlineEmailFor === plan;
    const price = cadence === "year" ? yearlyPrice : monthlyPrice;
    const accentCls =
      accent === "pro"
        ? "border-amber-400/30 ring-1 ring-amber-400/20"
        : "border-neutral-800";

    return (
      <div className={`rounded-2xl border ${accentCls} bg-neutral-900 p-4`}>
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
            disabled={busy || sending}
            className="mt-4 w-full"
          >
            {plan === "member"
              ? showTrialChip
                ? TRIAL_COPY
                : cadence === "year"
                ? "Choose Member – yearly"
                : "Choose Member – £2.99/mo"
              : cadence === "year"
              ? "Choose Pro – yearly"
              : "Choose Pro – £7.99/mo"}
          </PrimaryButton>
        ) : (
          <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
            <input
              ref={inputRef}
              name={`${plan}-email`}
              type="email"
              inputMode="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={onEnter(handleInlineEmailSend)}
              className="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
            />
            <PrimaryButton onClick={handleInlineEmailSend} disabled={busy || sending}>
              {sent ? "Link sent ✓" : sending ? "Sending…" : "Send sign-in link"}
            </PrimaryButton>
            <p className="col-span-full text-xs text-neutral-500">
              We’ll continue to <strong>{title}</strong> ({cadence}) after you sign in.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <Container>
      <PageHeader
        title="Join tradecard"
        subtitle={
          tab === "join"
            ? "Pick a plan for protection, early deals and monthly rewards — or start free and upgrade any time."
            : "Sign in with a magic link. No password needed."
        }
        aside={
          tab === "join" && shouldShowTrial(me) ? (
            <span className="promo-chip promo-chip-xs-hide">{TRIAL_COPY}</span>
          ) : undefined
        }
      />

      {/* Tab switcher */}
      <div className="mb-3 inline-flex rounded-xl border border-neutral-800 p-1">
        <button
          onClick={() => setTab("join")}
          className={`px-3 py-1.5 text-sm rounded-lg ${
            tab === "join" ? "bg-neutral-800" : "hover:bg-neutral-900"
          }`}
        >
          Join
        </button>
        <button
          onClick={() => setTab("signin")}
          className={`px-3 py-1.5 text-sm rounded-lg ${
            tab === "signin" ? "bg-neutral-800" : "hover:bg-neutral-900"
          }`}
        >
          Sign in
        </button>
      </div>

      {tab === "join" && (
        <div className="mb-4 inline-flex rounded-xl border border-neutral-800 p-1">
          <button
            onClick={() => setCadence("month")}
            className={`px-3 py-1.5 text-sm rounded-lg ${
              cadence === "month" ? "bg-neutral-800" : "hover:bg-neutral-900"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setCadence("year")}
            className={`px-3 py-1.5 text-sm rounded-lg ${
              cadence === "year" ? "bg-neutral-800" : "hover:bg-neutral-900"
            }`}
          >
            Yearly (save)
          </button>
        </div>
      )}

      {/* Alerts */}
      {info && (
        <div className="mb-4 alert alert-info" aria-live="polite">
          {info}
        </div>
      )}
      {checkoutError && (
        <div className="mb-4 alert alert-error" aria-live="polite">
          {checkoutError}
        </div>
      )}

      {tab === "join" ? (
        <>
          {/* Paid plans */}
          <div className="grid gap-4 md:grid-cols-2">
            <PlanCard
              plan="member"
              title="Member"
              monthlyPrice="£2.99/mo"
              yearlyPrice="£29.00/yr"
              features={[
                "Full offer access",
                "Protect Lite benefits",
                "Monthly prize entry",
                "Digital card",
              ]}
              accent="member"
              inputRef={memberEmailRef}
            />
            <PlanCard
              plan="pro"
              title="Pro"
              monthlyPrice="£7.99/mo"
              yearlyPrice="£79.00/yr"
              features={[
                "Everything in Member",
                "Early-access deals & Pro-only offers",
                "Double prize entries",
              ]}
              accent="pro"
              inputRef={proEmailRef}
            />
          </div>

          {/* Free Access sign-up — hidden while an inline capture is active */}
          {!inlineEmailFor && (
            <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="text-sm text-neutral-300">
                  Prefer to start free? Join with Access to browse and redeem offers. Upgrade any time.
                </div>
                <div className="flex w-full flex-col items-stretch gap-2 md:w-auto md:flex-row">
                  <input
                    ref={freeEmailRef}
                    name="free-email"
                    type="email"
                    inputMode="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={onEnter(handleFreeJoin)}
                    className="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 md:w-64"
                  />
                  <PrimaryButton
                    onClick={handleFreeJoin}
                    disabled={busy || sending}
                    className="text-sm"
                  >
                    {sent ? "Link sent ✓" : sending ? "Sending…" : "Join free"}
                  </PrimaryButton>
                </div>
              </div>
              <div className="mt-2 text-xs text-neutral-500">
                No card details needed • You’ll return to /offers after sign-in
                {wanted && (
                  <span className="ml-2 text-neutral-400">
                    (We’ll continue to <strong>{wanted}</strong> after you sign in)
                  </span>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        // Sign in tab
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
          <div className="text-sm text-neutral-300">
            Enter your email and we’ll send you a magic link.
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
            <input
              ref={signinEmailRef}
              name="signin-email"
              type="email"
              inputMode="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={onEnter(handleFreeJoin)}
              className="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
            />
            <PrimaryButton onClick={handleFreeJoin} disabled={busy || sending}>
              {sent ? "Link sent ✓" : sending ? "Sending…" : "Email me a link"}
            </PrimaryButton>
          </div>
          <p className="mt-2 text-xs text-neutral-500">
            You’ll return to /offers after sign-in. If your link has expired or was already used,
            request a new one.
          </p>
        </div>
      )}
    </Container>
  );
}