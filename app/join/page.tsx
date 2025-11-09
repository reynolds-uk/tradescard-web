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
type Interval = "month" | "year";

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
  const [interval, setInterval] = useState<Interval>("month");
  const [email, setEmail] = useState("");
  const [info, setInfo] = useState<string>("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [wanted, setWanted] = useState<Exclude<Plan, "access"> | null>(null);
  const [inlineEmailFor, setInlineEmailFor] =
    useState<Exclude<Plan, "access"> | null>(null);
  const [showFreeEmail, setShowFreeEmail] = useState(false); // only reveal when pressing "Join free"
  const emailRef = useRef<HTMLInputElement>(null);

  // Supabase client
  const supabase = useMemo(
    () => createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ),
    []
  );

  const showTrialChip = shouldShowTrial(me);

  // Default tab & intent from query
  useEffect(() => {
    const mode = (params.get("mode") || "").toLowerCase();
    const qPlan = params.get("plan") as Exclude<Plan, "access"> | null;
    const qInterval = (params.get("interval") as Interval) || null;
    if (mode === "signin") setTab("signin");
    if (qPlan) setWanted(qPlan);
    if (qInterval === "year") setInterval("year");
  }, [params]);

  // Handle auth redirect errors
  useEffect(() => {
    const err = params.get("error") || params.get("error_code");
    if (!err) return;
    const key = (err || "").toLowerCase();
    const msg = AUTH_ERROR_MAP[key] || "We couldn’t verify your link. Please request a new one.";
    setTab("signin");
    setInfo(msg);
    try {
      const url = new URL(window.location.href);
      ["error","error_code","error_description","status","success","canceled"].forEach(k => url.searchParams.delete(k));
      window.history.replaceState({}, "", url.pathname);
    } catch {}
  }, [params]);

  // If already signed in, continue checkout or go to /offers
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user) {
        const raw = window.localStorage.getItem("join_wanted_plan");
        if (raw) {
          window.localStorage.removeItem("join_wanted_plan");
          try {
            const { plan, interval: savedInterval } = JSON.parse(raw) as {
              plan: Exclude<Plan, "access">;
              interval: Interval;
            };
            await startMembership(plan, savedInterval, { trial: showTrialChip });
            return;
          } catch {
            /* fall-through */
          }
        }
        router.replace("/offers");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Inline email for chosen paid plan when logged out
  useEffect(() => {
    const raw = (typeof window !== "undefined"
      ? window.localStorage.getItem("join_wanted_plan")
      : null);
    try {
      const parsed = raw ? (JSON.parse(raw) as { plan?: Exclude<Plan,"access">; interval?: Interval }) : null;
      if (parsed?.interval) setInterval(parsed.interval);
      const plan = wanted || parsed?.plan || null;
      if (!plan) return;
      if (!user) {
        setInlineEmailFor(plan);
        setTimeout(() => emailRef.current?.focus(), 0);
      }
    } catch { /* no-op */ }
  }, [user, wanted]);

  function isValidEmail(v: string) {
    return /^\S+@\S+\.\S+$/.test(v.trim());
  }

  async function sendMagicLink(targetEmail: string, redirectTo = "/offers") {
    const trimmed = targetEmail.trim();
    if (!trimmed || !isValidEmail(trimmed)) {
      setInfo("Enter a valid email to get your sign-in link.");
      emailRef.current?.focus();
      throw new Error("invalid_email");
    }
    const { error: supaErr } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { emailRedirectTo: new URL(redirectTo, APP_URL).toString() },
    });
    if (supaErr) throw supaErr;
  }

  async function handleSendLink() {
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
      // logged out → inline email on chosen card and persist intent + interval
      setWanted(plan);
      setInlineEmailFor(plan);
      try {
        window.localStorage.setItem("join_wanted_plan", JSON.stringify({ plan, interval }));
      } catch {}
      setTimeout(() => emailRef.current?.focus(), 0);
      return;
    }
    track(plan === "member" ? "join_member_click" : "join_pro_click", { trial: showTrialChip, interval });
    await startMembership(plan, interval, { trial: showTrialChip });
  }

  async function handleInlineEmailSend() {
    if (!inlineEmailFor) return;
    setInfo("");
    try {
      setSending(true);
      // return to /join so we can resume chosen plan+interval from localStorage
      await sendMagicLink(email, "/join");
      setSent(true);
      setInfo(`Link sent. After you sign in, we’ll continue to ${inlineEmailFor} (${interval}).`);
      track("join_free_click");
    } catch (e) {
      if ((e as Error)?.message !== "invalid_email") {
        setInfo("We couldn’t send the link just now. Please try again.");
      }
    } finally {
      setSending(false);
    }
  }

  const onEnterSubmit = (fn: () => void) => (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); fn(); }
  };

  /* ---------- UI bits ---------- */

  const IntervalToggle = () => (
    <div className="mb-3 inline-flex rounded-xl border border-neutral-800 p-1">
      <button
        onClick={() => setInterval("month")}
        className={`px-3 py-1.5 text-sm rounded-lg ${interval==="month" ? "bg-neutral-800" : "hover:bg-neutral-900"}`}
        aria-pressed={interval==="month"}
      >
        Monthly
      </button>
      <button
        onClick={() => setInterval("year")}
        className={`px-3 py-1.5 text-sm rounded-lg ${interval==="year" ? "bg-neutral-800" : "hover:bg-neutral-900"}`}
        aria-pressed={interval==="year"}
      >
        Yearly <span className="opacity-70">(save)</span>
      </button>
    </div>
  );

  function PlanCard({
    plan,
    title,
    priceMonthly,
    priceYearly,
    features,
    accent,
  }: {
    plan: Exclude<Plan, "access">;
    title: string;
    priceMonthly: string; // e.g. "£2.99/mo"
    priceYearly: string;  // e.g. "£29/yr"
    features: string[];
    accent?: "pro" | "member";
  }) {
    const isInline = inlineEmailFor === plan;
    const accentCls =
      accent === "pro"
        ? "border-brand/30 ring-1 ring-brand/20"
        : "border-neutral-800";
    const price = interval === "year" ? priceYearly : priceMonthly;
    const cta =
      plan === "member"
        ? (showTrialChip ? TRIAL_COPY : (interval === "year" ? "Choose Member – £29/yr" : "Choose Member – £2.99/mo"))
        : (interval === "year" ? "Choose Pro – £79/yr" : "Choose Pro – £7.99/mo");

    return (
      <div className={`rounded-2xl border ${accentCls} bg-neutral-900 p-4`}>
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold">{title}</div>
          <div className="text-sm text-neutral-300">{price}</div>
        </div>

        <ul className="mt-2 space-y-1 text-sm text-neutral-300">
          {features.map((f) => <li key={f}>• {f}</li>)}
        </ul>

        {!isInline ? (
          <PrimaryButton
            onClick={() => choose(plan)}
            disabled={busy || sending}
            className="mt-4 w-full"
          >
            {cta}
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
              onKeyDown={onEnterSubmit(handleInlineEmailSend)}
              className="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
            />
            <PrimaryButton onClick={handleInlineEmailSend} disabled={busy || sending}>
              {sent ? "Link sent ✓" : sending ? "Sending…" : "Send sign-in link"}
            </PrimaryButton>
            <p className="col-span-full text-xs text-neutral-500">
              We’ll continue to <strong>{title}</strong> ({interval}) after you sign in.
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
        aside={tab === "join" && showTrialChip ? <span className="promo-chip promo-chip-xs-hide">{TRIAL_COPY}</span> : undefined}
      />

      {/* Tabs */}
      <div className="mb-4 inline-flex rounded-xl border border-neutral-800 p-1">
        <button
          onClick={() => setTab("join")}
          className={`px-3 py-1.5 text-sm rounded-lg ${tab==="join" ? "bg-neutral-800" : "hover:bg-neutral-900"}`}
        >
          Join
        </button>
        <button
          onClick={() => setTab("signin")}
          className={`px-3 py-1.5 text-sm rounded-lg ${tab==="signin" ? "bg-neutral-800" : "hover:bg-neutral-900"}`}
        >
          Sign in
        </button>
      </div>

      {info && <div className="mb-4 alert alert-info">{info}</div>}
      {checkoutError && <div className="mb-4 alert alert-error">{checkoutError}</div>}

      {tab === "join" ? (
        <>
          <IntervalToggle />

          {/* Paid plans */}
          <div className="grid gap-4 md:grid-cols-2">
            <PlanCard
              plan="member"
              title="Member"
              priceMonthly="£2.99/mo"
              priceYearly="£29/yr"
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
              priceMonthly="£7.99/mo"
              priceYearly="£79/yr"
              features={[
                "Everything in Member",
                "Early-access deals & Pro-only offers",
                "Double prize entries",
              ]}
              accent="pro"
            />
          </div>

          {/* Free Access sign-up — no email box until they click */}
          <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="text-sm text-neutral-300">
                Prefer to start free? Join with Access to browse and redeem offers. Upgrade any time.
              </div>

              {!showFreeEmail ? (
                <PrimaryButton onClick={() => setShowFreeEmail(true)} className="md:w-auto">
                  Join free
                </PrimaryButton>
              ) : (
                <div className="flex w-full flex-col items-stretch gap-2 md:w-auto md:flex-row">
                  <input
                    ref={emailRef}
                    type="email"
                    inputMode="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={onEnterSubmit(handleSendLink)}
                    className="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 md:w-64"
                  />
                  <PrimaryButton onClick={handleSendLink} disabled={busy || sending} className="text-sm">
                    {sent ? "Link sent ✓" : sending ? "Sending…" : "Email me a link"}
                  </PrimaryButton>
                </div>
              )}
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
        </>
      ) : (
        // Sign in tab
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
          <div className="text-sm text-neutral-300">Enter your email and we’ll send you a magic link.</div>
          <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
            <input
              ref={emailRef}
              type="email"
              inputMode="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={onEnterSubmit(handleSendLink)}
              className="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
            />
            <PrimaryButton onClick={handleSendLink} disabled={busy || sending}>
              {sent ? "Link sent ✓" : sending ? "Sending…" : "Email me a link"}
            </PrimaryButton>
          </div>
          <p className="mt-2 text-xs text-neutral-500">
            You’ll return to /offers after sign-in. If your link has expired or was already used, request a new one.
          </p>
        </div>
      )}
    </Container>
  );
}