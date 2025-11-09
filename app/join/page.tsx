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
type Cycle = "month" | "year";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://tradescard-web.vercel.app";

// Display prices (don’t hard-wire Stripe IDs here)
const PRICE = {
  member: { month: "£2.99/mo", year: "£29.00/yr" },
  pro: { month: "£7.99/mo", year: "£79.00/yr" },
} as const;

const AUTH_ERROR_MAP: Record<string, string> = {
  otp_expired: "That sign-in link has expired. Please request a new one.",
  otp_disabled: "Magic links are currently unavailable. Please try again shortly.",
  invalid_grant: "That sign-in link is no longer valid. Request a new one.",
  server_error: "We had trouble verifying your link. Try again.",
};

export default function JoinPage() {
  const router = useRouter();
  const params = useSearchParams();

  // Auth / promo context
  const me = useMe();
  const showTrial = shouldShowTrial(me);

  // Checkout helper (startMembership(plan, cycle, { trial }))
  const { busy, error: checkoutError, startMembership } = useJoinActions("/join");

  // Tabs & cycle
  const [tab, setTab] = useState<"join" | "signin">("join");
  const [cycle, setCycle] = useState<Cycle>("month");

  // Which paid card has its inline email open
  const [openInline, setOpenInline] = useState<null | "member" | "pro">(null);
  // Free block open/closed
  const [freeOpen, setFreeOpen] = useState(false);

  // Email states (separate so inputs don’t “fight”)
  const [emailPaid, setEmailPaid] = useState("");
  const [emailFree, setEmailFree] = useState("");

  // UX flags
  const [info, setInfo] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  // Refs for sensible focus
  const paidInputRef = useRef<HTMLInputElement>(null);
  const freeInputRef = useRef<HTMLInputElement>(null);
  const bootstrapped = useRef(false);

  // Supabase client (client-side OTP)
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
    const qPlan = (params.get("plan") || "").toLowerCase() as "" | "member" | "pro";
    const qCycle = (params.get("cycle") || "").toLowerCase() as "" | Cycle;
    const qFree = params.get("free");

    if (mode === "signin") setTab("signin");
    if (mode === "join") setTab("join");
    if (qCycle === "year") setCycle("year");
    if (qFree === "1") {
      setFreeOpen(true);
      setOpenInline(null);
      queueMicrotask(() => freeInputRef.current?.focus());
    }

    // Pre-open a paid card inline when logged out
    if (!me.user && (qPlan === "member" || qPlan === "pro")) {
      setOpenInline(qPlan);
      setFreeOpen(false);
      queueMicrotask(() => paidInputRef.current?.focus());
    }

    // Handle any auth error in query
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

  /* ------------------------------------------
     React to query changes after the page loads
  -------------------------------------------*/
  useEffect(() => {
    const mode = (params.get("mode") || params.get("tab") || "").toLowerCase();
    const qFree = params.get("free");
    const qCycle = (params.get("cycle") || "").toLowerCase() as "" | Cycle;
    const qPlan = (params.get("plan") || "").toLowerCase() as "" | "member" | "pro";

    if (mode === "signin") setTab("signin");
    else if (mode === "join") setTab("join");

    if (qCycle === "year") setCycle("year");
    if (qFree === "1") {
      setFreeOpen(true);
      setOpenInline(null);
    }

    // allow marketing links to open a card inline even after mount
    if (!me.user && (qPlan === "member" || qPlan === "pro")) {
      setOpenInline(qPlan);
      setFreeOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  /* --------------------------
     Keep URL in sync with tab
  ---------------------------*/
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("mode", tab === "signin" ? "signin" : "join");
    window.history.replaceState({}, "", url.toString());
    // Close any open inputs when changing tab
    setOpenInline(null);
    setFreeOpen(false);
  }, [tab]);

  /* ---------------------------------------------------------
     If already signed in, continue checkout or go to /offers
  ----------------------------------------------------------*/
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data?.session?.user) return;

      if (openInline) {
        await startMembership(openInline, cycle, { trial: showTrial });
        return;
      }
      router.replace("/offers");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openInline]);

  /* --------------------------
     Helpers / actions
  ---------------------------*/
  const isValidEmail = (v: string) => /^\S+@\S+\.\S+$/.test(v.trim());

  async function sendMagicLink(targetEmail: string, redirectTo = "/offers") {
    const trimmed = targetEmail.trim();
    if (!trimmed || !isValidEmail(trimmed)) throw new Error("invalid_email");
    const { error: supaErr } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { emailRedirectTo: new URL(redirectTo, APP_URL).toString() },
    });
    if (supaErr) throw supaErr;
  }

  // Free (Access) sign-up
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

  // Choose a paid plan
  async function choose(plan: Exclude<Plan, "access">) {
    setInfo("");
    // Logged out → open inline on that card, close free
    if (!me.user) {
      setOpenInline(plan);
      setFreeOpen(false);
      queueMicrotask(() => paidInputRef.current?.focus());
      return;
    }
    // Logged in → straight to checkout
    track(plan === "member" ? "join_member_click" : "join_pro_click", {
      trial: showTrial,
      cycle,
    });
    await startMembership(plan, cycle, { trial: showTrial });
  }

  // Send link for paid inline (then continue to chosen plan after sign-in)
  async function handlePaidLink() {
    if (!openInline) return;
    setInfo("");
    try {
      setSending(true);
      await sendMagicLink(emailPaid, "/join"); // return here so we can resume checkout
      setSent(true);
      setInfo(`Link sent. After you sign in, we’ll continue to ${openInline} (${cycle}).`);
      track("join_free_click"); // simple reuse for “send link”
    } catch (e) {
      setSent(false);
      setInfo(
        (e as Error)?.message === "invalid_email"
          ? "Enter a valid email to get your sign-in link."
          : "We couldn’t send the link just now. Please try again."
      );
      paidInputRef.current?.focus();
    } finally {
      setSending(false);
    }
  }

  // Enter-to-submit
  const onEnter =
    (fn: () => void) => (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        fn();
      }
    };

  /* --------------------------
     Small UI helpers
  ---------------------------*/
  function CycleTabs() {
    return (
      <div className="mb-4 inline-flex rounded-xl border border-neutral-800 p-1">
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
    );
  }

  function PlanCard({
    plan,
    title,
    features,
    accent,
    badge,
  }: {
    plan: Exclude<Plan, "access">;
    title: string;
    features: string[];
    accent?: "pro" | "member";
    badge?: string;
  }) {
    const isInline = openInline === plan;
    const price = PRICE[plan][cycle];

    const accentCls =
      accent === "pro"
        ? "border-amber-400/30 ring-1 ring-amber-400/20"
        : "border-neutral-800";

    // CTA label logic (promo only on Member monthly)
    const ctaLabel =
      plan === "member" && cycle === "month" && showTrial
        ? TRIAL_COPY
        : plan === "member"
        ? `Choose Member – ${price}`
        : `Choose Pro – ${price}`;

    return (
      <div className={`rounded-2xl border ${accentCls} bg-neutral-900 p-4`}>
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold">{title}</div>
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
          <PrimaryButton
            onClick={() => choose(plan)}
            disabled={busy || sending}
            className="mt-4 w-full"
          >
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
              value={emailPaid}
              onChange={(e) => setEmailPaid(e.target.value)}
              onKeyDown={onEnter(handlePaidLink)}
              className="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
            />
            <PrimaryButton onClick={handlePaidLink} disabled={busy || sending}>
              {sent ? "Link sent ✓" : sending ? "Sending…" : "Send sign-in link"}
            </PrimaryButton>
            <p className="col-span-full text-xs text-neutral-500">
              We’ll continue to <strong>{title}</strong> ({cycle}) after you sign in.
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
    <Container>
      <PageHeader
        title="Join TradeCard"
        subtitle={
          tab === "join"
            ? "Protection, real trade deals and monthly rewards — start free and upgrade any time."
            : "Sign in securely with a magic link. No password needed."
        }
        aside={
          tab === "join" && showTrial ? (
            <span className="promo-chip promo-chip-xs-hide">{TRIAL_COPY}</span>
          ) : undefined
        }
      />

      {/* Top tabs */}
      <div role="tablist" aria-label="Join or sign in" className="mb-3 inline-flex rounded-xl border border-neutral-800 p-1">
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
                "Protect Lite included",
                "Monthly prize entry",
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
                "Early-access & Pro-only offers",
                "Double prize entries",
              ]}
              accent="pro"
            />
          </div>

          {/* Free (Access) path */}
          <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="text-sm text-neutral-300">
                Prefer to start free? Join with Access to browse and redeem offers. Upgrade any time.
              </div>

              {!freeOpen ? (
                <PrimaryButton
                  onClick={() => {
                    setFreeOpen(true);
                    setOpenInline(null); // only one email box at a time
                    queueMicrotask(() => freeInputRef.current?.focus());
                  }}
                  className="self-start md:self-auto"
                >
                  Join free
                </PrimaryButton>
              ) : (
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
              )}
            </div>
            <div className="mt-2 text-xs text-neutral-500">
              No card details needed • You’ll return to /offers after sign-in
              {openInline && (
                <span className="ml-2 text-neutral-400">
                  (We’ll continue to <strong>{openInline}</strong> after you sign in)
                </span>
              )}
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
  );
}