// app/join/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import PrimaryButton from "@/components/PrimaryButton";
import { track } from "@/lib/track";
import { API_BASE } from "@/lib/apiBase";

type Plan = "access" | "member" | "pro";
type PaidPlan = Exclude<Plan, "access">;
type Cycle = "month" | "year";

// Display prices (UI only)
const PRICE = {
  member: { month: 2.99, year: 29.0 },
  pro: { month: 7.99, year: 79.0 },
} as const;

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

function isValidEmail(v: string) {
  return /^\S+@\S+\.\S+$/.test(v.trim());
}

// Trial flag: env or promo=trial
function useTrialEnabled() {
  const params = useSearchParams();
  const qp = (params.get("promo") || "").toLowerCase();
  const envOn = (process.env.NEXT_PUBLIC_TRIAL_ENABLED || "").toString() === "1";
  return envOn || qp === "trial";
}

export default function JoinPage() {
  const params = useSearchParams();
  const trialEnabled = useTrialEnabled();

  // Tabs & cycle
  const [tab, setTab] = useState<"join" | "signin">("join");
  const [cycle, setCycle] = useState<Cycle>("month");

  // Selected plan and open inline email (always equals selected plan)
  const [selectedPlan, setSelectedPlan] = useState<PaidPlan>("member");

  // Email states
  const [emailPaid, setEmailPaid] = useState("");
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

  // Supabase for magic links (free + sign-in tab)
  const supabase = useMemo(
    () =>
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  // Initialise from URL once
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
    if (qPlan === "member" || qPlan === "pro") setSelectedPlan(qPlan);
    if (qFree === "1") {
      queueMicrotask(() => freeInputRef.current?.focus());
    }
    queueMicrotask(() => paidInputRef.current?.focus());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // React to query changes after the page loads
  useEffect(() => {
    const mode = (params.get("mode") || params.get("tab") || "").toLowerCase();
    const qFree = params.get("free");
    const qCycle = (params.get("cycle") || "").toLowerCase() as "" | Cycle;
    const qPlan = (params.get("plan") || "").toLowerCase() as "" | PaidPlan;

    if (mode === "signin") setTab("signin");
    else if (mode === "join") setTab("join");

    if (qCycle === "year") setCycle("year");
    if (qPlan === "member" || qPlan === "pro") setSelectedPlan(qPlan);
    if (qFree === "1") queueMicrotask(() => freeInputRef.current?.focus());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  // Helpers
  async function sendMagicLink(targetEmail: string, redirectTo: string) {
    const trimmed = targetEmail.trim();
    if (!trimmed || !isValidEmail(trimmed)) throw new Error("invalid_email");
    const { error: supaErr } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        emailRedirectTo: redirectTo,
      },
    });
    if (supaErr) throw supaErr;
  }

  // PAID: Start checkout (always unauthenticated; email is mandatory)
  async function startPaidCheckout(plan: PaidPlan) {
    try {
      setCheckoutError("");
      setBusy(true);

      if (!isValidEmail(emailPaid)) {
        paidInputRef.current?.focus();
        throw new Error("Enter a valid email to continue to payment.");
      }

      const res = await fetch(`${API_BASE}/api/checkout`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: emailPaid.trim(),
          plan,
          cycle,
          trial: trialEnabled && plan === "member" && cycle === "month" ? true : false,
          next: "/checkout/success?verify=1",
          source: "/join",
        }),
        keepalive: true,
      });

      const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !json?.url) {
        throw new Error(json?.error || `Unable to start checkout (${res.status})`);
      }

      track(plan === "member" ? "join_member_click" : "join_pro_click", {
        cycle,
        trial: trialEnabled && plan === "member" && cycle === "month",
      });

      window.location.href = json.url!;
    } catch (e: any) {
      setCheckoutError(e?.message || "We couldn’t start checkout. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  // FREE (Access) join via magic link
  async function handleFreeJoin() {
    setInfo("");
    try {
      setSending(true);
      await sendMagicLink(emailFree, "/offers");
      setSent(true);
      setInfo("Check your inbox for your sign-in link.");
      // analytics
      track("join_free_click");
    } catch (e: any) {
      setSent(false);
      setInfo(
        e?.message === "invalid_email"
          ? "Enter a valid email to get your link."
          : "We couldn’t send the link just now. Please try again."
      );
      freeInputRef.current?.focus();
    } finally {
      setSending(false);
    }
  }

  // Enter-to-submit helper
  const onEnter = (fn: () => void) => (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      fn();
    }
  };

  // Derived for sticky CTA
  const { months: mFree, saved } = monthsFree(
    PRICE[selectedPlan].month,
    PRICE[selectedPlan].year
  );
  const monthlyLabel = fmtMonth(PRICE[selectedPlan].month);
  const yearlyLabel = fmtYear(PRICE[selectedPlan].year);

  const stickyLabel =
    trialEnabled && selectedPlan === "member" && cycle === "month"
      ? "Try Member for £1"
      : cycle === "month"
      ? `Continue — ${monthlyLabel}`
      : `Continue — ${fmtYear(PRICE[selectedPlan].year)}`;

  const showSticky = tab === "join";

  // Small UI pieces
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
    const price = cycle === "month" ? fmtMonth(PRICE[plan].month) : fmtYear(PRICE[plan].year);
    const selected = selectedPlan === plan;

    const accentCls =
      accent === "pro"
        ? "border-amber-400/30 ring-1 ring-amber-400/20"
        : "border-neutral-800";

    const ctaLabel =
      trialEnabled && plan === "member" && cycle === "month"
        ? "Try Member for £1"
        : plan === "member"
        ? `Choose Member – ${price}`
        : `Choose Pro – ${price}`;

    const selectThisPlan = () => {
      if (!selected) {
        setSelectedPlan(plan);
        setCheckoutError("");
        queueMicrotask(() => paidInputRef.current?.focus());
      }
    };

    return (
      <div className={`rounded-2xl border ${accentCls} bg-neutral-900 p-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-pressed={selected}
              aria-label={`Select ${title}`}
              onClick={selectThisPlan}
              className={`relative inline-flex h-5 w-5 items-center justify-center rounded-full border ${
                selected ? "border-white" : "border-neutral-500"
              }`}
            >
              {selected && <span className="block h-3.5 w-3.5 rounded-full bg-white" />}
            </button>
            <button
              type="button"
              onClick={selectThisPlan}
              className="text-left text-lg font-semibold hover:opacity-90"
            >
              {title}
            </button>
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

        {/* Inline email capture is ALWAYS visible for the selected plan */}
        {selected && (
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
              value={emailPaid}
              onChange={(e) => setEmailPaid(e.target.value)}
              onKeyDown={onEnter(() => startPaidCheckout(plan))}
              className="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
            />
            <PrimaryButton onClick={() => startPaidCheckout(plan)} disabled={busy || sending}>
              {busy ? "Opening checkout…" : "Continue to payment"}
            </PrimaryButton>
            <p className="col-span-full text-xs text-neutral-500">
              Enter your email, then we’ll take you to payment. After paying, check your inbox to confirm your account.
            </p>
          </div>
        )}

        {!selected && (
          <PrimaryButton
            onClick={selectThisPlan}
            disabled={busy || sending}
            className="mt-4 w-full"
          >
            {ctaLabel}
          </PrimaryButton>
        )}
      </div>
    );
  }

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
              onClick={() => startPaidCheckout(selectedPlan)}
              disabled={busy || sending}
              className="w-full text-base py-3"
            >
              {stickyLabel}
            </PrimaryButton>
            <div className="mt-2 text-center text-[11px] text-neutral-400">
              {cycle === "year"
                ? `${fmtMonth(PRICE[selectedPlan].month)} equivalent • ${
                    monthsFree(PRICE[selectedPlan].month, PRICE[selectedPlan].year).months > 0
                      ? `${monthsFree(PRICE[selectedPlan].month, PRICE[selectedPlan].year).months} months free`
                      : "Save vs monthly"
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
            tab === "join" && trialEnabled ? (
              <span className="promo-chip promo-chip-xs-hide">Try Member for £1</span>
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
            onClick={() => setTab("join")}
            className={`px-3 py-1.5 text-sm rounded-lg ${
              tab === "join" ? "bg-neutral-800" : "hover:bg-neutral-900"
            }`}
          >
            Join
          </button>
          <button
            role="tab"
            aria-selected={tab === "signin"}
            onClick={() => setTab("signin")}
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