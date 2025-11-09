// app/join/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState, memo } from "react";
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

  const { busy, error: checkoutError, startMembership } = useJoinActions("/join");

  const [tab, setTab] = useState<"join" | "signin">("join");
  const [cycle, setCycle] = useState<Cycle>("month");

  // Which paid card (if any) is showing the inline email box
  const [openInline, setOpenInline] = useState<null | "member" | "pro">(null);

  // Free path state (kept separate from paid)
  const [freeOpen, setFreeOpen] = useState(false);
  const [emailFree, setEmailFree] = useState("");

  const [info, setInfo] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const freeRef = useRef<HTMLInputElement>(null);

  const supabase = useMemo(
    () =>
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  // One-off initialisation from URL
  useEffect(() => {
    const mode = (params.get("mode") || "").toLowerCase();
    const qPlan = (params.get("plan") || "").toLowerCase() as "" | "member" | "pro";
    const qCycle = (params.get("cycle") || "").toLowerCase() as "" | Cycle;
    if (mode === "signin") setTab("signin");
    if (qCycle === "year") setCycle("year");
    if (!me.user && (qPlan === "member" || qPlan === "pro")) {
      setOpenInline(qPlan);
    }

    // Handle auth errors in callback URL
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

  // If already signed in, either continue checkout or go to /offers
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data?.session?.user) return;
      if (openInline) {
        // NOTE: useJoinActions expects the billing interval (cycle) only
        await startMembership(openInline, cycle);
        return;
      }
      router.replace("/offers");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openInline]);

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
      freeRef.current?.focus();
    } finally {
      setSending(false);
    }
  }

  // Paid plan choose (when already logged in)
  async function choosePaid(plan: "member" | "pro") {
    setInfo("");
    if (!me.user) {
      setOpenInline(plan); // open inline box; focus handled inside the card component
      return;
    }
    track(plan === "member" ? "join_member_click" : "join_pro_click", {
      trial: showTrial,
      cycle,
    });
    await startMembership(plan, cycle);
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

      {/* Top tabs */}
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

      {/* Alerts */}
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

      {/* Main */}
      {tab === "join" ? (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <PaidCard
              key="member"
              plan="member"
              title="Member"
              features={[
                "Full offer access",
                "Protect Lite benefits",
                "Monthly prize entry",
                "Digital card",
              ]}
              price={PRICE.member[cycle]}
              showTrial={showTrial && cycle === "month"}
              open={openInline === "member"}
              onOpen={() => setOpenInline("member")}
              cycle={cycle}
              onChoose={() => choosePaid("member")}
              onStartAfterSignin={(email) => sendMagicLink(email, "/join")}
            />
            <PaidCard
              key="pro"
              plan="pro"
              title="Pro"
              features={[
                "Everything in Member",
                "Early-access deals & Pro-only offers",
                "Double prize entries",
              ]}
              price={PRICE.pro[cycle]}
              showTrial={false}
              open={openInline === "pro"}
              onOpen={() => setOpenInline("pro")}
              cycle={cycle}
              onChoose={() => choosePaid("pro")}
              onStartAfterSignin={(email) => sendMagicLink(email, "/join")}
            />
          </div>

          {/* Free path */}
          <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="text-sm text-neutral-300">
                Prefer to start free? Join with Access to browse and redeem offers. Upgrade any time.
              </div>

              {!freeOpen ? (
                <PrimaryButton
                  onClick={() => {
                    setFreeOpen(true);
                    // focus once the input appears
                    setTimeout(() => freeRef.current?.focus(), 0);
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
        // Sign in tab
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

/* --------------------------
   Paid card (isolated state)
---------------------------*/

const PaidCard = memo(function PaidCard({
  plan,
  title,
  features,
  price,
  showTrial,
  open,
  onOpen,
  cycle,
  onChoose,
  onStartAfterSignin,
}: {
  plan: "member" | "pro";
  title: string;
  features: string[];
  price: string;
  showTrial: boolean;
  open: boolean;
  onOpen: () => void;
  cycle: Cycle;
  onChoose: () => void; // when logged-in
  onStartAfterSignin: (email: string) => Promise<void>; // send magic link and return to /join
}) {
  // Local email & focus, so re-renders elsewhere never remount this <input>
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [info, setInfo] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus when this card opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  const onEnter =
    (fn: () => void) => (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        fn();
      }
    };

  async function sendLink() {
    setInfo("");
    try {
      setSending(true);
      await onStartAfterSignin(email); // redirects back to /join after sign-in
      setSent(true);
      setInfo(`Link sent. After you sign in, we’ll continue to ${plan} (${cycle}).`);
      // Using existing event for link sends
      track("join_free_click");
    } catch (e) {
      setSent(false);
      setInfo("We couldn’t send the link just now. Please try again.");
      inputRef.current?.focus();
    } finally {
      setSending(false);
    }
  }

  const ctaLabel =
    plan === "member" && showTrial
      ? TRIAL_COPY
      : plan === "member"
      ? `Choose Member – ${price}`
      : `Choose Pro – ${price}`;

  const accentCls =
    plan === "pro" ? "border-amber-400/30 ring-1 ring-amber-400/20" : "border-neutral-800";

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

      {!open ? (
        <PrimaryButton
          onClick={onOpen /* open inline if logged out; onChoose runs from parent when logged in */}
          disabled={sending}
          className="mt-4 w-full"
        >
          {ctaLabel}
        </PrimaryButton>
      ) : (
        <div className="mt-4">
          {info && (
            <div className="mb-2 rounded border border-blue-400/30 bg-blue-500/10 px-3 py-2 text-blue-200 text-xs">
              {info}
            </div>
          )}
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <input
              ref={inputRef}
              type="email"
              inputMode="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={onEnter(sendLink)}
              className="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
              autoComplete="email"
            />
            <PrimaryButton onClick={sendLink} disabled={sending}>
              {sent ? "Link sent ✓" : sending ? "Sending…" : "Send sign-in link"}
            </PrimaryButton>
            <p className="col-span-full text-xs text-neutral-500">
              We’ll continue to <strong>{title}</strong> ({cycle}) after you sign in.
            </p>
          </div>
        </div>
      )}
    </div>
  );
});