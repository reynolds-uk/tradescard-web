"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import PrimaryButton from "@/components/PrimaryButton";
import { useMe } from "@/lib/useMe";
import { shouldShowTrial, TRIAL_COPY } from "@/lib/trial";
import { track } from "@/lib/track";

type Plan = "access" | "member" | "pro";
type PaidPlan = Exclude<Plan, "access">;
type Cycle = "month" | "year";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://tradescard-web.vercel.app";

// Display prices (UI only)
const PRICE = {
  member: { month: 2.99, year: 29.0 },
  pro: { month: 7.99, year: 79.0 },
} as const;

const AUTH_ERROR_MAP: Record<string, string> = {
  otp_expired: "That sign-in link has expired. Please request a new one.",
  otp_disabled: "Magic links are currently unavailable. Please try again shortly.",
  invalid_grant: "That sign-in link is no longer valid. Request a new one.",
  server_error: "We had trouble verifying your link. Try again.",
};

function fmtMonth(v: number) {
  return `£${v.toFixed(2)}/mo`;
}
function fmtYear(v: number) {
  return `£${v.toFixed(2)}/yr`;
}
function monthsFree(monthly: number, yearly: number) {
  const saved = monthly * 12 - yearly;
  const months = Math.round(saved / monthly);
  return { months: Math.max(0, months), saved: Math.max(0, saved) };
}

export default function JoinPage() {
  const params = useSearchParams();

  // Auth / promo context
  const me = useMe();
  const showTrial = shouldShowTrial(me);

  // Tabs & cycle
  const [tab, setTab] = useState<"join" | "signin">("join");
  const [cycle, setCycle] = useState<Cycle>("month");

  // Which paid plan is selected and which is open inline
  const [selectedPlan, setSelectedPlan] = useState<PaidPlan | null>(null);
  const [openInline, setOpenInline] = useState<PaidPlan | null>(null);

  // Email states (separate per plan to avoid remount/focus loss)
  const [emailMember, setEmailMember] = useState("");
  const [emailPro, setEmailPro] = useState("");
  const [emailFree, setEmailFree] = useState("");

  // UX flags
  const [info, setInfo] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");

  // Refs
  const paidInputRef = useRef<HTMLInputElement>(null);
  const freeInputRef = useRef<HTMLInputElement>(null);
  const bootstrapped = useRef(false);

  // Supabase client
  const supabase = useMemo(
    () =>
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  /* --------------------------
     Initialise from URL once
  ---------------------------*/
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;

    const mode = (params.get("mode") || params.get("tab") || "").toLowerCase();
    const qPlan = (params.get("plan") || "").toLowerCase() as "" | PaidPlan;
    const qCycle = (params.get("cycle") || "").toLowerCase() as "" | Cycle;
    const qFree = params.get("free");

    if (mode === "signin") setTab("signin");
    if (mode === "join") setTab("join");
    if (qCycle === "year") setCycle("year");

    // Select a plan from deep link, but don't open email until the user clicks
    if (qPlan === "member" || qPlan === "pro") {
      setSelectedPlan(qPlan);
      setOpenInline(null);
    }

    if (qFree === "1") {
      // Explicitly open free inline (used in marketing links)
      setOpenInline(null);
      queueMicrotask(() => freeInputRef.current?.focus());
    }

    // Handle auth error messages
    const err = params.get("error") || params.get("error_code");
    if (err) {
      const key = err.toLowerCase();
      setTab("signin");
      setInfo(AUTH_ERROR_MAP[key] || "We couldn’t verify your link. Please request a new one.");
      try {
        const url = new URL(window.location.href);
        ["error", "error_code", "error_description", "status", "success", "canceled"].forEach(
          (k) => url.searchParams.delete(k)
        );
        window.history.replaceState({}, "", url.pathname);
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* --------------------------
     React to query changes
  ---------------------------*/
  useEffect(() => {
    const mode = (params.get("mode") || params.get("tab") || "").toLowerCase();
    const qFree = params.get("free");
    const qCycle = (params.get("cycle") || "").toLowerCase() as "" | Cycle;
    const qPlan = (params.get("plan") || "").toLowerCase() as "" | PaidPlan;

    if (mode === "signin") setTab("signin");
    else if (mode === "join") setTab("join");

    if (qCycle === "year") setCycle("year");
    if (qPlan === "member" || qPlan === "pro") setSelectedPlan(qPlan);
    if (qFree === "1") {
      setOpenInline(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  /* --------------------------
     Helpers / actions
  ---------------------------*/
  const isValidEmail = (v: string) => /^\S+@\S+\.\S+$/.test(v.trim());

  async function sendMagicLink(targetEmail: string, redirectTo: string) {
    const trimmed = targetEmail.trim();
    if (!trimmed || !isValidEmail(trimmed)) throw new Error("invalid_email");
    const { error: supaErr } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { emailRedirectTo: new URL(redirectTo, APP_URL).toString() },
    });
    if (supaErr) throw supaErr;
  }

  async function startPaidCheckout(plan: PaidPlan) {
    try {
      setBusy(true);
      setCheckoutError("");

      const res = await fetch(`/api/checkout`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan, cycle }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({} as any));
        throw new Error(err?.error || "Unable to start checkout");
      }

      const { url } = (await res.json()) as { url?: string };
      if (!url) throw new Error("No checkout URL returned");

      track(plan === "member" ? "join_member_click" : "join_pro_click", {
        cycle,
        trial: plan === "member" && cycle === "month" && showTrial ? true : false,
      });
      window.location.href = url;
    } catch (e: any) {
      setCheckoutError(e?.message || "We couldn’t start checkout. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function choose(plan: PaidPlan) {
    setInfo("");
    setSelectedPlan(plan);
    setOpenInline(plan); // open only when the user chooses
    queueMicrotask(() => paidInputRef.current?.focus());
  }

  async function handlePaidContinue() {
    if (!openInline) return;
    setInfo("");
    try {
      const targetEmail = openInline === "member" ? emailMember : emailPro;
      if (!isValidEmail(targetEmail)) throw new Error("Enter a valid email address.");

      // Send magic link that returns to this page with plan & cycle
      const redirect = `/join?plan=${openInline}&cycle=${cycle}`;
      setSending(true);
      await sendMagicLink(targetEmail, redirect);
      setSent(true);
      setInfo("Check your inbox for your secure sign-in link to continue to payment.");
    } catch (e: any) {
      setSent(false);
      setCheckoutError(e?.message || "We couldn’t start checkout. Please try again.");
      paidInputRef.current?.focus();
    } finally {
      setSending(false);
    }
  }

  async function handleFreeJoin() {
    setInfo("");
    try {
      setSending(true);
      await sendMagicLink(emailFree, "/offers");
      setSent(true);
      setInfo("Check your inbox for your sign-in link.");
      track("join_free_click");
    } catch (e) {
      setSent(false);
      setInfo(
        (e as Error)?.message === "invalid_email"
          ? "Enter a valid email to get your sign-in link."
          : "We couldn’t send the link just now. Please try again."
      );
      freeInputRef.current?.focus();
    } finally {
      setSending(false);
    }
  }

  const onEnter =
    (fn: () => void) => (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        fn();
      }
    };

  /* --------------------------
     Derived UI for sticky CTA
  ---------------------------*/
  const active = selectedPlan ?? "member";
  const { months: mFree, saved } = monthsFree(PRICE[active].month, PRICE[active].year);
  const monthlyLabel = fmtMonth(PRICE[active].month);
  const yearlyLabel = fmtYear(PRICE[active].year);

  const stickyLabel =
    active === "member" && cycle === "month" && showTrial
      ? TRIAL_COPY
      : cycle === "month"
      ? `Continue — ${monthlyLabel}`
      : `Continue — ${yearlyLabel}`;

  const showSticky = tab === "join" && !openInline;

  /* --------------------------
     Small UI pieces
  ---------------------------*/
  function CycleTabs() {
    return (
      <div className="mb-4 inline-flex items-center gap-2">
        <div className="inline-flex rounded-xl border border-neutral-800 p-1">
          {(["month", "year"] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCycle(c)}
              className={`px-3 py-1.5 text-sm rounded-lg ${
                cycle === c ? "bg-neutral-800" : "hover:bg-neutral-900"
              }`}
              aria-pressed={cycle === c}
            >
              {c === "month" ? "Monthly" : "Yearly (save)"}
            </button>
          ))}
        </div>
        {cycle === "year" && (
          <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-xs text-amber-300">
            {mFree > 0 ? `${mFree} months free` : "Save vs monthly"} • £{saved.toFixed(2)} saved
          </span>
        )}
      </div>
    );
  }

  function WhatYouGet() {
    return (
      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3">
          <div className="text-sm font-semibold">Offers</div>
          <p className="mt-1 text-sm text-neutral-300">
            Deals that cut everyday costs — tools, fuel, food & essentials.
          </p>
        </div>
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3">
          <div className="text-sm font-semibold">Benefits</div>
          <p className="mt-1 text-sm text-neutral-300">
            Useful from day one, plus partner-only pricing.
          </p>
        </div>
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3">
          <div className="text-sm font-semibold">Rewards</div>
          <p className="mt-1 text-sm text-neutral-300">
            Points each month — entries to regular prize draws.
          </p>
        </div>
      </div>
    );
  }

  function PlanCard({
    plan,
    title,
    features,
    accent,
    badge,
  }: {
    plan: PaidPlan;
    title: string;
    features: string[];
    accent?: "pro" | "member";
    badge?: string;
  }) {
    const isInline = openInline === plan;
    const selected = selectedPlan === plan;

    const price =
      cycle === "month" ? fmtMonth(PRICE[plan].month) : fmtYear(PRICE[plan].year);

    const accentCls =
      accent === "pro"
        ? "border-amber-400/30 ring-1 ring-amber-400/20"
        : "border-neutral-800";

    const ctaLabel =
      plan === "member" && cycle === "month" && showTrial
        ? TRIAL_COPY
        : plan === "member"
        ? `Choose Member – ${price}`
        : `Choose Pro – ${price}`;

    const openThisPlan = () => {
      // Select & open inline; close other
      setSelectedPlan(plan);
      setOpenInline(plan);
      setInfo("");
      queueMicrotask(() => paidInputRef.current?.focus());
    };

    const emailValue = plan === "member" ? emailMember : emailPro;
    const setEmail = plan === "member" ? setEmailMember : setEmailPro;

    return (
      <div className={`rounded-2xl border ${accentCls} bg-neutral-900 p-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-pressed={selected}
              aria-label={`Select ${title}`}
              onClick={openThisPlan}
              className={`relative inline-flex h-5 w-5 items-center justify-center rounded-full border ${
                selected ? "border-white" : "border-neutral-500"
              }`}
            >
              {selected && <span className="block h-3.5 w-3.5 rounded-full bg-white" />}
            </button>
            <div className="text-lg font-semibold">{title}</div>
          </div>
          <div className="flex items-center gap-2">
            {badge && (
              <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-xs text-amber-300">
                {badge}
              </span>
            )}
            <div className="text-sm text-neutral-300">{price}</div>
          </div>
        </div>

        <ul className="mt-2 space-y-1 text-sm text-neutral-300">
          {features.map((f) => (
            <li key={f}>• {f}</li>
          ))}
        </ul>

        {!isInline ? (
          <PrimaryButton onClick={openThisPlan} disabled={busy || sending} className="mt-4 w-full">
            {ctaLabel}
          </PrimaryButton>
        ) : (
          <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
            <label htmlFor={`email-${plan}`} className="sr-only">
              Email address
            </label>
            <input
              id={`email-${plan}`}
              ref={paidInputRef}
              type="email"
              inputMode="email"
              placeholder="you@example.com"
              autoComplete="email"
              value={emailValue}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={onEnter(handlePaidContinue)}
              className="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
            />
            <PrimaryButton onClick={handlePaidContinue} disabled={sending}>
              {sending ? "Sending link…" : "Continue to payment"}
            </PrimaryButton>
            <p className="col-span-full text-xs text-neutral-500">
              Enter your email, then we’ll take you to payment. After paying, check your inbox to
              confirm your account.
            </p>
          </div>
        )}
      </div>
    );
  }

  /* --------------------------
     Render
  ---------------------------*/
  return (
    <>
      {/* Sticky summary CTA (mobile) */}
      {showSticky && (
        <div
          className="fixed inset-x-0 bottom-0 z-40 md:hidden border-t border-neutral-800 bg-neutral-950/95 backdrop-blur supports-[backdrop-filter]:bg-neutral-950/70"
          role="region"
          aria-label="Selected plan summary"
        >
          <div className="safe-inset-bottom" />
          <div className="mx-auto max-w-5xl px-4 py-3">
            <PrimaryButton
              onClick={() => selectedPlan && choose(selectedPlan)}
              disabled={!selectedPlan || busy || sending}
              className="w-full text-base py-3"
            >
              {stickyLabel}
            </PrimaryButton>
            <div className="mt-2 text-center text-[11px] text-neutral-400">
              {cycle === "year"
                ? `${fmtMonth(PRICE[active].month)} equivalent • ${
                    mFree > 0 ? `${mFree} months free` : "Save vs monthly"
                  }`
                : `Billed monthly • Cancel any time`}
            </div>
          </div>
        </div>
      )}

      <Container className={showSticky ? "safe-bottom-pad" : ""}>
        <PageHeader
          title="The card for the people who build Britain"
          subtitle={
            tab === "join"
              ? "A simple membership for the trade — offers that cut everyday costs, benefits you’ll actually use, and monthly rewards."
              : "Sign in securely with a magic link. No password needed."
          }
          aside={
            tab === "join" && showTrial ? (
              <span className="promo-chip promo-chip-xs-hide">{TRIAL_COPY}</span>
            ) : undefined
          }
        />

        {/* Top tabs */}
        <div
          role="tablist"
          aria-label="Join or sign in"
          className="mb-3 inline-flex rounded-xl border border-neutral-800 p-1"
        >
          <button
            role="tab"
            aria-selected={tab === "join"}
            onClick={() => {
              setTab("join");
              setOpenInline(null);
            }}
            className={`px-3 py-1.5 text-sm rounded-lg ${
              tab === "join" ? "bg-neutral-800" : "hover:bg-neutral-900"
            }`}
          >
            Join
          </button>
          <button
            role="tab"
            aria-selected={tab === "signin"}
            onClick={() => {
              setTab("signin");
              setOpenInline(null);
            }}
            className={`px-3 py-1.5 text-sm rounded-lg ${
              tab === "signin" ? "bg-neutral-800" : "hover:bg-neutral-900"
            }`}
          >
            Sign in
          </button>
        </div>

        {tab === "join" && <CycleTabs />}
        {tab === "join" && <WhatYouGet />}

        {/* Alerts */}
        {info && (
          <div
            className="mb-4 rounded border border-blue-400/30 bg-blue-500/10 px-3 py-2 text-blue-200 text-sm"
            aria-live="polite"
          >
            {info}
          </div>
        )}
        {checkoutError && (
          <div
            className="mb-4 rounded border border-red-600/40 bg-red-900/10 px-3 py-2 text-red-300 text-sm"
            aria-live="polite"
          >
            {checkoutError}
          </div>
        )}

        {/* MAIN */}
        {tab === "join" ? (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <PlanCard
                plan="member"
                title="Member"
                features={[
                  "All offers unlocked",
                  "Member benefits included",
                  "Monthly rewards entries",
                  "Digital card",
                ]}
                badge="Most popular"
                accent="member"
              />
              <PlanCard
                plan="pro"
                title="Pro"
                features={[
                  "Everything in Member",
                  "Early access & Pro-only offers",
                  "Bigger rewards boosts",
                ]}
                accent="pro"
              />
            </div>

            {/* Free (Access) path */}
            <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="text-sm text-neutral-300">
                  Prefer to start free? Join with Access to browse and redeem public offers. Upgrade any time.
                </div>

                <div className="flex w-full flex-col items-stretch gap-2 md:w-auto md:flex-row">
                  <label htmlFor="email-access" className="sr-only">
                    Email address
                  </label>
                  <input
                    id="email-access"
                    ref={freeInputRef}
                    type="email"
                    inputMode="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    value={emailFree}
                    onChange={(e) => setEmailFree(e.target.value)}
                    onKeyDown={onEnter(handleFreeJoin)}
                    className="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 md:w-64"
                  />
                  <PrimaryButton onClick={handleFreeJoin} disabled={busy || sending} className="text-sm">
                    {sent ? "Link sent ✓" : sending ? "Sending…" : "Email me a link"}
                  </PrimaryButton>
                </div>
              </div>
              <div className="mt-2 text-xs text-neutral-500">
                No card details needed • You’ll return to /offers after sign-in
              </div>
            </div>
          </>
        ) : (
          // SIGN IN TAB
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
            <div className="mb-3 text-sm text-neutral-300">
              Enter your email and we’ll email you a secure sign-in link.
            </div>
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <label htmlFor="email-signin" className="sr-only">
                Email address
              </label>
              <input
                id="email-signin"
                ref={freeInputRef}
                type="email"
                inputMode="email"
                placeholder="you@example.com"
                autoComplete="email"
                value={emailFree}
                onChange={(e) => setEmailFree(e.target.value)}
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
    </>
  );
}