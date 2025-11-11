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

const PRICE = {
  member: { month: 2.99, year: 29.0 },
  pro: { month: 7.99, year: 79.0 },
} as const;

const fmtMonth = (v: number) => `£${v.toFixed(2)}/mo`;
const fmtYear = (v: number) => `£${v.toFixed(2)}/yr`;
const isValidEmail = (v: string) => /^\S+@\S+\.\S+$/.test(v.trim());

function monthsFree(monthly: number, yearly: number) {
  const saved = monthly * 12 - yearly;
  const months = Math.round(saved / monthly);
  return { months: Math.max(0, months), saved: Math.max(0, saved) };
}

function useTrialEnabled() {
  const params = useSearchParams();
  const qp = (params.get("promo") || "").toLowerCase();
  const envOn = (process.env.NEXT_PUBLIC_TRIAL_ENABLED || "") === "1";
  return envOn || qp === "trial";
}

export default function JoinPage() {
  const params = useSearchParams();
  const trialEnabled = useTrialEnabled();

  // page state
  const [tab, setTab] = useState<"join" | "signin">("join");
  const [cycle, setCycle] = useState<Cycle>("month");

  // selection & inputs
  const [selectedPlan, setSelectedPlan] = useState<PaidPlan | null>(null); // ← none open on load
  const [emailPaid, setEmailPaid] = useState("");
  const [emailFree, setEmailFree] = useState("");
  const [freeOpen, setFreeOpen] = useState(false); // closed by default

  // ui flags
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [info, setInfo] = useState("");
  const [checkoutError, setCheckoutError] = useState("");
  const [emailError, setEmailError] = useState("");

  // refs
  const paidInputRef = useRef<HTMLInputElement>(null);
  const freeInputRef = useRef<HTMLInputElement>(null);
  const bootstrapped = useRef(false);

  // Supabase (for free & sign-in)
  const supabase = useMemo(
    () =>
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  /* ---------- init from URL (once) ---------- */
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

    // On landing we **do not** open any input; we only pre-select the radio.
    if (qPlan === "member" || qPlan === "pro") setSelectedPlan(qPlan);
    if (qFree === "1") setFreeOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- helpers ---------- */

  async function sendMagicLink(targetEmail: string, redirectTo: string) {
    const trimmed = targetEmail.trim();
    if (!trimmed || !isValidEmail(trimmed)) {
      throw new Error("invalid_email");
    }
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { emailRedirectTo: redirectTo },
    });
    if (error) throw error;
  }

  async function startPaidCheckout(plan: PaidPlan) {
    try {
      setCheckoutError("");
      setEmailError("");

      if (!isValidEmail(emailPaid)) {
        setEmailError("Enter a valid email to continue to payment.");
        paidInputRef.current?.focus();
        return;
      }

      setBusy(true);

      const res = await fetch(`${API_BASE}/api/checkout`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: emailPaid.trim(),
          plan,
          cycle,
          trial: trialEnabled && plan === "member" && cycle === "month",
          next: "/checkout/success?verify=1",
          source: "/join",
        }),
        keepalive: true,
      });

      const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !json?.url) throw new Error(json?.error || "Unable to start checkout");

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

  async function handleFreeJoin() {
    setInfo("");
    try {
      setSending(true);
      await sendMagicLink(emailFree, "/offers");
      setSent(true);
      setInfo("Check your inbox for your sign-in link.");
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

  const onEnter =
    (fn: () => void) =>
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        fn();
      }
    };

  /* ---------- derived UI ---------- */

  const currentPlan: PaidPlan | null = selectedPlan;
  const showSticky = tab === "join";
  const stickyLabel =
    currentPlan && trialEnabled && currentPlan === "member" && cycle === "month"
      ? "Try Member for £1"
      : currentPlan
      ? cycle === "month"
        ? `Continue — ${fmtMonth(PRICE[currentPlan].month)}`
        : `Continue — ${fmtYear(PRICE[currentPlan].year)}`
      : "Choose a plan";

  /* ---------- small pieces ---------- */

  function CycleTabs() {
    const label = (c: Cycle) =>
      c === "month" ? "Monthly" : "Yearly (save)";
    const { months: mFree, saved } = monthsFree(
      PRICE[(currentPlan || "member") as PaidPlan].month,
      PRICE[(currentPlan || "member") as PaidPlan].year
    );
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
              {label(c)}
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
    badge,
    accent,
  }: {
    plan: PaidPlan;
    title: string;
    features: string[];
    badge?: string;
    accent?: "pro" | "member";
  }) {
    const selected = selectedPlan === plan;

    // Keep both forms mounted to completely avoid unmount/focus issues.
    // We only *visually* hide the inactive one.
    const price =
      cycle === "month" ? fmtMonth(PRICE[plan].month) : fmtYear(PRICE[plan].year);

    const ctaLabel =
      trialEnabled && plan === "member" && cycle === "month"
        ? "Try Member for £1"
        : plan === "member"
        ? `Choose Member – ${price}`
        : `Choose Pro – ${price}`;

    const accentCls =
      accent === "pro"
        ? "border-amber-400/30 ring-1 ring-amber-400/20"
        : "border-neutral-800";

    const openThisPlan = () => {
      if (selectedPlan !== plan) {
        setSelectedPlan(plan);
        setFreeOpen(false);
        setEmailError("");
        // focus after paint
        requestAnimationFrame(() => paidInputRef.current?.focus());
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
              onClick={openThisPlan}
              className={`relative inline-flex h-5 w-5 items-center justify-center rounded-full border ${
                selected ? "border-white" : "border-neutral-500"
              }`}
            >
              {selected && <span className="block h-3.5 w-3.5 rounded-full bg-white" />}
            </button>
            <button
              type="button"
              onClick={openThisPlan}
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

        {/* CTA when collapsed */}
        {!selected && (
          <PrimaryButton
            onClick={openThisPlan}
            className="mt-4 w-full"
            disabled={busy || sending}
          >
            {ctaLabel}
          </PrimaryButton>
        )}

        {/* Inline form area (kept mounted, toggled via visibility) */}
        <div className={`mt-4 ${selected ? "block" : "hidden"}`}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              startPaidCheckout(plan);
            }}
            className="grid gap-2 sm:grid-cols-[1fr_auto]"
          >
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
              onChange={(e) => {
                setEmailPaid(e.target.value);
                if (emailError) setEmailError("");
              }}
              onKeyDown={onEnter(() => startPaidCheckout(plan))}
              // prevent ancestor handlers from stealing focus
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onFocus={(e) => e.stopPropagation()}
              aria-invalid={!!emailError}
              className="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
            />
            <PrimaryButton type="submit" disabled={busy || sending}>
              {busy ? "Opening checkout…" : "Continue to payment"}
            </PrimaryButton>
            <p className="col-span-full text-xs text-neutral-500">
              Enter your email, then we’ll take you to payment. After paying, check your inbox to confirm your account.
            </p>
            {emailError && (
              <p className="col-span-full text-xs text-red-300">{emailError}</p>
            )}
            {checkoutError && (
              <p className="col-span-full text-xs text-red-300">{checkoutError}</p>
            )}
          </form>
        </div>
      </div>
    );
  }

  /* ---------- render ---------- */

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
              onClick={() => currentPlan && startPaidCheckout(currentPlan)}
              disabled={busy || sending || !currentPlan}
              className="w-full text-base py-3"
            >
              {stickyLabel}
            </PrimaryButton>
            <div className="mt-2 text-center text-[11px] text-neutral-400">
              {cycle === "year"
                ? `${fmtMonth(PRICE[(currentPlan || "member") as PaidPlan].month)} equivalent • ${
                    monthsFree(
                      PRICE[(currentPlan || "member") as PaidPlan].month,
                      PRICE[(currentPlan || "member") as PaidPlan].year
                    ).months > 0
                      ? `${
                          monthsFree(
                            PRICE[(currentPlan || "member") as PaidPlan].month,
                            PRICE[(currentPlan || "member") as PaidPlan].year
                          ).months
                        } months free`
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

        {/* tabs */}
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

        {/* alerts */}
        {info && (
          <div
            className="mb-4 rounded border border-blue-400/30 bg-blue-500/10 px-3 py-2 text-blue-200 text-sm"
            aria-live="polite"
          >
            {info}
          </div>
        )}

        {/* main */}
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

            {/* Free (Access) path) */}
            <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="text-sm text-neutral-300">
                  Prefer to start free? Join with Access to browse and redeem public offers. Upgrade any time.
                </div>

                {!freeOpen ? (
                  <PrimaryButton
                    onClick={() => {
                      setFreeOpen(true);
                      setSelectedPlan(null);
                      setTimeout(() => freeInputRef.current?.focus(), 0);
                    }}
                    className="self-start md:self-auto"
                  >
                    Join free
                  </PrimaryButton>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleFreeJoin();
                    }}
                    className="flex w-full flex-col items-stretch gap-2 md:w-auto md:flex-row"
                  >
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
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      className="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 md:w-64"
                    />
                    <PrimaryButton type="submit" disabled={busy || sending} className="text-sm">
                      {sent ? "Link sent ✓" : sending ? "Sending…" : "Email me a link"}
                    </PrimaryButton>
                  </form>
                )}
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
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleFreeJoin();
              }}
              className="grid gap-2 sm:grid-cols-[1fr_auto]"
            >
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
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                className="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
              />
              <PrimaryButton type="submit" disabled={busy || sending}>
                {sent ? "Link sent ✓" : sending ? "Sending…" : "Email me a link"}
              </PrimaryButton>
            </form>
            <p className="mt-2 text-xs text-neutral-500">
              You’ll return to /offers after sign-in. If your link has expired or was already used, request a new one.
            </p>
          </div>
        )}
      </Container>
    </>
  );
}