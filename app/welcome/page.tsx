"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import PrimaryButton from "@/components/PrimaryButton";
import { shouldShowTrial, TRIAL_COPY } from "@/lib/trial";
import { track } from "@/lib/track";

// Shared data hooks
import { useSessionUser, useProfile, useMember } from "@/lib/data";
import ActivateEmailOverlay from "@/components/ActivateEmailOverlay";

type Tier = "access" | "member" | "pro";

const TIER_COPY: Record<Tier, { label: string; blurb: string }> = {
  access: {
    label: "ACCESS",
    blurb:
      "You can browse and redeem public offers. Upgrade any time to unlock benefits and monthly rewards.",
  },
  member: {
    label: "MEMBER",
    blurb:
      "You’ve unlocked core benefits and monthly rewards entries. Explore offers and start saving today.",
  },
  pro: {
    label: "PRO",
    blurb:
      "You’ve unlocked all benefits, early-access deals and the highest monthly rewards entries.",
  },
};

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://tradescard-web.vercel.app";
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ??
  process.env.NEXT_PUBLIC_API_BASE ??
  "https://tradescard-api.vercel.app";

/* -------------------------------------------------------------------------------------------------
   Hook: confirm checkout once (handles ?cs=... or ?session_id=..., sends OTP if user not signed in)
-------------------------------------------------------------------------------------------------- */
function useConfirmCheckoutOnce() {
  const params = useSearchParams();
  const router = useRouter();

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Activation overlay state
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [pendingInfo, setPendingInfo] = useState<string>("");
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0); // seconds

  const supabase = useMemo(
    () =>
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  // Track first render
  const tracked = useRef(false);
  useEffect(() => {
    if (!tracked.current) {
      tracked.current = true;
      track("welcome_view");
    }
  }, []);

  // Confirm once
  const ran = useRef(false);
  useEffect(() => {
    const cs = params.get("cs") || params.get("session_id");
    if (!cs || ran.current) return;
    ran.current = true;

    (async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10_000);

      try {
        setBusy(true);
        setErr(null);
        setPending(false);

        const res = await fetch(
          `${API_BASE}/api/confirm-checkout?cs=${encodeURIComponent(cs)}`,
          { credentials: "include", cache: "no-store", signal: controller.signal }
        );

        if (res.status === 401) {
          // Not signed in yet — fetch email from Stripe session and send the magic link
          setPendingInfo("Finalising your membership…");
          const s = await fetch(
            `${API_BASE}/api/checkout/session?session_id=${encodeURIComponent(cs)}`,
            { cache: "no-store" }
          );
          if (!s.ok) throw new Error("Could not retrieve checkout session details.");
          const { email } = (await s.json()) as { email?: string };
          if (!email) throw new Error("We couldn’t determine your email for activation.");

          setPendingEmail(email);

          // Send initial magic link and start 30s cooldown
          const { error: otpErr } = await supabase.auth.signInWithOtp({
            email,
            options: { emailRedirectTo: new URL("/welcome", APP_URL).toString() },
          });
          if (otpErr) throw otpErr;

          setPendingInfo(
            "We’ve emailed you a secure sign-in link. Open it to activate your account."
          );
          setCountdown(30);
          return;
        }

        const data = await res.json().catch(() => ({}));

        if (data?.ok || data?.need_sign_in) {
          // Success path (or webhook has written) — drop params & refresh
          track("welcome_view", { confirmed: true });
          router.replace("/welcome"); // removes ?cs= from the URL
          router.refresh?.();
          return;
        }

        if (data?.pending || params.get("pending") === "1") {
          setPending(true);
          track("welcome_view", { pending: true });
          return;
        }

        if (data?.error) {
          setErr(data.error);
        } else if (!res.ok) {
          setErr(`We couldn’t confirm your membership (HTTP ${res.status}).`);
        }
      } catch (e: any) {
        // AbortError → show gentle pending instead of a scary error
        if (e?.name === "AbortError") {
          setPending(true);
        } else {
          setErr(e?.message || "Network error confirming checkout.");
        }
      } finally {
        clearTimeout(timer);
        setBusy(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, router, supabase]);

  // Cooldown tick
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => setCountdown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  // Resend magic link
  const resend = async () => {
    if (!pendingEmail || countdown > 0 || resending) return;
    setResending(true);
    setCountdown(30);
    try {
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email: pendingEmail,
        options: { emailRedirectTo: new URL("/welcome", APP_URL).toString() },
      });
      if (otpErr) throw otpErr;
    } catch {
      setCountdown(0);
    } finally {
      setResending(false);
    }
  };

  // If overlay is visible, lock scroll
  const showActivationOverlay = !!pendingEmail;
  useEffect(() => {
    if (!showActivationOverlay) return;
    const { body } = document;
    const prev = body.style.overflow;
    body.style.overflow = "hidden";
    return () => {
      body.style.overflow = prev;
    };
  }, [showActivationOverlay]);

  return {
    busy,
    pending,
    err,
    showActivationOverlay,
    pendingEmail,
    pendingInfo,
    resend,
    resending,
    countdown,
    canResend: countdown === 0 && !!pendingEmail,
  };
}

/* -------------------------------------------------------------------------------------------------
   Page
-------------------------------------------------------------------------------------------------- */
export default function WelcomePage() {
  // SESSION + DATA
  const { data: me } = useSessionUser();
  const userId = me?.id ?? null;
  const { data: profile } = useProfile(userId);
  const { data: member } = useMember(userId);

  const tier: Tier = (member?.tier as Tier) ?? "access";
  const showTrial = shouldShowTrial({ tier } as any);

  const params = useSearchParams();
  const router = useRouter();

  const supabase = useMemo(
    () =>
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  // Confirm checkout if `?cs=` or `?session_id=`
  const {
    busy,
    pending,
    err,
    showActivationOverlay,
    pendingEmail,
    pendingInfo,
    resend,
    resending,
    countdown,
    canResend,
  } = useConfirmCheckoutOnce();

  // Form state (schema has no phone column)
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedOnce, setSavedOnce] = useState(false);
  const [error, setError] = useState("");

  // UI helpers
  const [copied, setCopied] = useState(false);
  const accessCta = showTrial ? TRIAL_COPY : "Become a Member (£2.99/mo)";

  // Prefill once profile lands
  useEffect(() => {
    if (!profile) return;
    setName(profile.name ?? "");
  }, [profile]);

  const maskedId = (id?: string) => (id ? `${id.slice(0, 6)}…${id.slice(-4)}` : "—");

  // “Resume checkout” if they came back with continue=1 and still on Access
  const wantedPlan = (params.get("plan") as "member" | "pro" | null) || null;
  const wantedCycle = (params.get("cycle") as "month" | "year" | null) || null;
  const showResume =
    params.get("continue") === "1" && tier === "access" && wantedPlan && wantedCycle;

  async function resumeCheckout() {
    try {
      const res = await fetch(`${API_BASE}/api/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ plan: wantedPlan, cycle: wantedCycle }),
      });
      const data = await res.json();
      if (!res.ok || !data?.url) throw new Error(data?.error || "Could not start checkout.");
      window.location.href = data.url;
    } catch {
      /* no-op */
    }
  }

  function goJoin(plan: "member" | "pro") {
    try {
      localStorage.setItem("join_wanted_plan", plan);
    } catch {}
    track("welcome_cta_join_member", { plan, trial: showTrial });
    window.location.href = "/join";
  }

  async function copyCardId() {
    if (!userId) return;
    try {
      await navigator.clipboard.writeText(userId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  async function saveAndContinue() {
    if (!userId) return;

    setError("");
    setSaving(true);
    try {
      // Only touch the columns that exist
      const { error: upErr } = await supabase
        .from("profiles")
        .upsert(
          {
            user_id: userId,
            email: profile?.email ?? null,
            name: name || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );

      if (upErr) throw upErr;

      setSavedOnce(true);
      track("welcome_profile_saved", { tier });

      window.location.href = tier === "access" ? "/offers" : "/account";
    } catch (e: any) {
      setError(e?.message || "We couldn’t save your details just now.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {showActivationOverlay && pendingEmail && (
        <ActivateEmailOverlay
          email={pendingEmail}
          info={pendingInfo}
          onResend={resend}
          canResend={canResend}
          countdown={countdown}
          resending={resending}
        />
      )}

      <Container>
        <PageHeader
          title="Welcome to TradeCard"
          subtitle="Here’s your card and a quick setup so we can serve you properly."
          aside={
            showTrial ? (
              <span className="hidden sm:inline rounded bg-amber-400/20 text-amber-200 text-xs px-2 py-1 border border-amber-400/30">
                {TRIAL_COPY}
              </span>
            ) : undefined
          }
        />

        {/* Inline status from confirm step */}
        {(busy || err || pending || showResume) && (
          <div className="mb-4 space-y-2">
            {busy && (
              <div className="rounded-lg border border-blue-400/30 bg-blue-500/10 px-3 py-2 text-blue-200 text-sm">
                Activating your membership…
              </div>
            )}
            {pending && !busy && !err && (
              <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-amber-200 text-sm">
                Payment is settling. This usually takes a moment — we’ll update automatically.
              </div>
            )}
            {err && (
              <div className="rounded-lg border border-red-600/40 bg-red-900/10 px-3 py-2 text-red-300 text-sm">
                {err}
              </div>
            )}
            {showResume && (
              <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-amber-200 text-sm">
                You didn’t finish checkout.{" "}
                <button
                  onClick={resumeCheckout}
                  className="underline decoration-dotted underline-offset-4 hover:opacity-90"
                >
                  Resume now
                </button>
                .
              </div>
            )}
          </div>
        )}

        {showTrial && (
          <div className="mb-4 rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-200">
            Limited-time offer: {TRIAL_COPY}
          </div>
        )}

        {/* Card + Next steps */}
        <section className="rounded-2xl border border-neutral-800 bg-gradient-to-br from-neutral-900 to-neutral-950 p-5">
          <div className="text-sm text-neutral-400">Your digital card</div>

          <div className="mt-2 grid gap-4 md:grid-cols-3">
            {/* Card & details */}
            <div className="md:col-span-2">
              <div className="text-2xl font-semibold">TradeCard</div>
              <div className="mt-1 text-sm text-neutral-300">{profile?.email ?? "—"}</div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="rounded-lg border border-neutral-800 p-3 text-center">
                  <div className="text-xl font-semibold">{TIER_COPY[tier].label}</div>
                  <div className="mt-1 text-xs text-neutral-400">Tier</div>
                </div>

                <div className="rounded-lg border border-neutral-800 p-3 text-center">
                  <div className="text-xl font-semibold truncate">
                    {maskedId(userId ?? undefined)}
                  </div>
                  <div className="mt-1 text-xs text-neutral-400">Card ID</div>
                </div>

                <div className="rounded-lg border border-neutral-800 p-3 text-center">
                  <button
                    onClick={copyCardId}
                    className="rounded bg-neutral-800 px-3 py-1 text-sm hover:bg-neutral-700 disabled:opacity-50"
                    disabled={!userId}
                  >
                    {copied ? "Copied ✓" : "Copy ID"}
                  </button>
                  <div className="mt-1 text-xs text-neutral-400">For support & verification</div>
                </div>
              </div>
            </div>

            {/* Next steps quick links */}
            <aside className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
              <div className="font-medium">What next?</div>
              <p className="mt-1 text-sm text-neutral-300">{TIER_COPY[tier].blurb}</p>

              <div className="mt-3 grid gap-2">
                <Link href="/offers" className="block">
                  <PrimaryButton className="w-full">Browse offers</PrimaryButton>
                </Link>

                {tier !== "access" ? (
                  <>
                    <Link href="/benefits" className="block">
                      <button className="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-2 font-medium hover:bg-neutral-800">
                        See your benefits
                      </button>
                    </Link>
                    <Link href="/rewards" className="block">
                      <button className="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-2 font-medium hover:bg-neutral-800">
                        Check rewards
                      </button>
                    </Link>
                  </>
                ) : (
                  <>
                    <PrimaryButton onClick={() => goJoin("member")} className="w-full">
                      {accessCta}
                    </PrimaryButton>
                    <button
                      onClick={() => goJoin("pro")}
                      className="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-2 font-medium hover:bg-neutral-800"
                    >
                      Choose Pro (£7.99/mo)
                    </button>
                  </>
                )}
              </div>
            </aside>
          </div>
        </section>

        {/* Onboarding form */}
        <section className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
          <div className="font-medium">Tell us how to reach you</div>
          <p className="mt-1 text-sm text-neutral-300">
            We’ll use this for support and rewards notifications. We never spam.
          </p>

          {error && (
            <div className="mt-3 rounded border border-red-600/40 bg-red-900/10 px-3 py-2 text-red-300 text-sm">
              {error}
            </div>
          )}
          {savedOnce && !error && (
            <div className="mt-3 rounded border border-green-600/40 bg-green-900/10 px-3 py-2 text-green-300 text-sm">
              Saved ✓
            </div>
          )}

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="name" className="block text-xs text-neutral-400 mb-1">
                Your name <span className="text-neutral-500">(optional)</span>
              </label>
              <input
                id="name"
                type="text"
                inputMode="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
                placeholder="e.g. Alex Smith"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <PrimaryButton onClick={saveAndContinue} disabled={saving}>
              {tier === "access" ? "Save & continue to offers" : "Save & go to my account"}
            </PrimaryButton>
            {tier === "access" && (
              <button
                type="button"
                onClick={() => {
                  track("welcome_skip", { tier });
                  router.push("/offers");
                }}
                className="rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm font-medium hover:bg-neutral-800"
              >
                Skip for now
              </button>
            )}
          </div>
        </section>
      </Container>
    </>
  );
}