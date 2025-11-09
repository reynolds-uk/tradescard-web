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

// display prices (purely visual here)
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

  const me = useMe();
  const showTrial = shouldShowTrial(me);

  // paid checkout helper
  const { busy, error: checkoutError, startMembership } = useJoinActions("/join");

  // UI tabs + billing cycle
  const [tab, setTab] = useState<"join" | "signin">("join");
  const [cycle, setCycle] = useState<Cycle>("month");

  // which paid card is “open” for inline email
  const [openInline, setOpenInline] = useState<null | "member" | "pro">(null);

  // separate, stable email state per input
  const [emailMember, setEmailMember] = useState("");
  const [emailPro, setEmailPro] = useState("");
  const [emailFree, setEmailFree] = useState("");

  // free block collapsed by default
  const [freeOpen, setFreeOpen] = useState(false);

  // messaging
  const [info, setInfo] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  // refs (focus when opening, not on each render)
  const memberRef = useRef<HTMLInputElement>(null);
  const proRef = useRef<HTMLInputElement>(null);
  const freeRef = useRef<HTMLInputElement>(null);

  // supabase client
  const supabase = useMemo(
    () =>
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  // initial URL-driven setup (run once)
  useEffect(() => {
    const mode = (params.get("mode") || "").toLowerCase();
    const qPlan = (params.get("plan") || "").toLowerCase() as "" | "member" | "pro";
    const qCycle = (params.get("cycle") || "").toLowerCase() as "" | Cycle;
    if (mode === "signin") setTab("signin");
    if (qCycle === "year") setCycle("year");
    if (!me.user && (qPlan === "member" || qPlan === "pro")) {
      setOpenInline(qPlan);
      queueMicrotask(() =>
        (qPlan === "member" ? memberRef : proRef).current?.focus()
      );
    }

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

  // if already signed in, continue checkout (if applicable) or go to /offers
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data?.session?.user) return;
      if (openInline) {
        await startMembership(openInline, { cycle, trial: showTrial });
        return;
      }
      router.replace("/offers");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openInline]);

  /* helpers */

  const isValidEmail = (v: string) => /^\S+@\S+\.\S+$/.test(v.trim());

  async function sendMagicLink(targetEmail: string, redirectTo = "/offers") {
    const trimmed = targetEmail.trim();
    if (!trimmed || !isValidEmail(trimmed)) throw new Error("invalid_email");
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { emailRedirectTo: new URL(redirectTo, APP_URL).toString() },
    });
    if (error) throw error;
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
      freeRef.current?.focus();
    } finally {
      setSending(false);
    }
  }

  async function choose(plan: Exclude<Plan, "access">) {
    setInfo("");
    if (!me.user) {
      setOpenInline(plan);
      queueMicrotask(() =>
        (plan === "member" ? memberRef : proRef).current?.focus()
      );
      return;
    }
    track(plan === "member" ? "join_member_click" : "join_pro_click", {
      trial: showTrial,
      cycle,
    });
    await startMembership(plan, { cycle, trial: showTrial });
  }

  async function sendPaidLink(plan: "member" | "pro") {
    const value = plan === "member" ? emailMember : emailPro;
    setInfo("");
    try {
      setSending(true);
      // return to /join so we can resume checkout
      await sendMagicLink(value, "/join");
      setSent(true);
      setInfo(`Link sent. After you sign in, we’ll continue to ${plan} (${cycle}).`);
      track("join_free_click"); // reuse event for “send link”
    } catch (e) {
      setSent(false);
      setInfo(
        (e as Error)?.message === "invalid_email"
          ? "Enter a valid email to get your sign-in link."
          : "We couldn’t send the link just now. Please try again."
      );
      (plan === "member" ? memberRef : proRef).current?.focus();
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

  function PaidCard({
    plan,
    title,
    features,
    email,
    setEmail,
    inputRef,
    accent,
  }: {
    plan: "member" | "pro";
    title: string;
    features: string[];
    email: string;
    setEmail: (v: string) => void;
    inputRef: React.RefObject<HTMLInputElement>;
    accent?: "pro" | "member";
  }) {
    const price = PRICE[plan][cycle];
    const isOpen = openInline === plan;

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

        {/* Keep both the CTA and the input in the DOM.
            We only toggle visibility so the input node never remounts (no blur). */}
        <div className="mt-4">
          <div className={isOpen ? "hidden" : "block"}>
            <PrimaryButton
              onClick={() => choose(plan)}
              disabled={busy || sending}
              className="w-full"
            >
              {ctaLabel}
            </PrimaryButton>
          </div>

          <div className={!isOpen ? "hidden" : "grid gap-2 sm:grid-cols-[1fr_auto]"}>
            <input
              ref={inputRef}
              type="email"
              inputMode="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={onEnter(() => sendPaidLink(plan))}
              className="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
              autoComplete="email"
            />
            <PrimaryButton onClick={() => sendPaidLink(plan)} disabled={busy || sending}>
              {sent ? "Link sent ✓" : sending ? "Sending…" : "Send sign-in link"}
            </PrimaryButton>
            <p className="col-span-full text-xs text-neutral-500">
              We’ll continue to <strong>{title}</strong> ({cycle}) after you sign in.
            </p>
          </div>
        </div>
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
          tab === "join" && showTrial ? (
            <span className="promo-chip promo-chip-xs-hide">{TRIAL_COPY}</span>
          ) : undefined
        }
      />

      {/* top tabs */}
      <div className="mb-3 inline-flex rounded-xl border border-neutral-800 p-1">
        <button
          onClick={() => setTab("join")}
          className={`px-3 py-1.5 text-sm rounded-lg ${
            tab === "join" ? "bg-neutral-800" : "hover:bg-neutral-900"
          }`}
          aria-pressed={tab === "join"}
        >
          Join
        </button>
        <button
          onClick={() => setTab("signin")}
          className={`px-3 py-1.5 text-sm rounded-lg ${
            tab === "signin" ? "bg-neutral-800" : "hover:bg-neutral-900"
          }`}
          aria-pressed={tab === "signin"}
        >
          Sign in
        </button>
      </div>

      {tab === "join" && <CycleTabs />}

      {/* alerts */}
      {info && (
        <div className="mb-4 rounded border border-blue-400/30 bg-blue-500/10 px-3 py-2 text-blue-200 text-sm">
          {info}
        </div>
      )}
      {checkoutError && (
        <div className="mb-4 rounded border border-red-600/40 bg-red-900/10 px-3 py-2 text-red-300 text-sm">
          {checkoutError}
        </div>
      )}

      {/* main content */}
      {tab === "join" ? (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <PaidCard
              plan="member"
              title="Member"
              features={[
                "Full offer access",
                "Protect Lite benefits",
                "Monthly prize entry",
                "Digital card",
              ]}
              email={emailMember}
              setEmail={setEmailMember}
              inputRef={memberRef}
              accent="member"
            />
            <PaidCard
              plan="pro"
              title="Pro"
              features={[
                "Everything in Member",
                "Early-access deals & Pro-only offers",
                "Double prize entries",
              ]}
              email={emailPro}
              setEmail={setEmailPro}
              inputRef={proRef}
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
                    queueMicrotask(() => freeRef.current?.focus());
                  }}
                  className="self-start md:self-auto"
                >
                  Join free
                </PrimaryButton>
              ) : (
                <div className="flex w-full flex-col items-stretch gap-2 md:w-auto md:flex-row">
                  <input
                    ref={freeRef}
                    type="email"
                    inputMode="email"
                    placeholder="you@example.com"
                    value={emailFree}
                    onChange={(e) => setEmailFree(e.target.value)}
                    onKeyDown={onEnter(handleFreeJoin)}
                    className="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 md:w-64"
                    autoComplete="email"
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
          <div className="text-sm text-neutral-300">
            Enter your email and we’ll send you a magic link.
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
            <input
              ref={freeRef}
              type="email"
              inputMode="email"
              placeholder="you@example.com"
              value={emailFree}
              onChange={(e) => setEmailFree(e.target.value)}
              onKeyDown={onEnter(handleFreeJoin)}
              className="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
              autoComplete="email"
            />
            <PrimaryButton onClick={handleFreeJoin} disabled={busy || sending}>
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