"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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

export default function WelcomePage() {
  // SESSION + DATA
  const { data: me } = useSessionUser();
  const userId = me?.id ?? null;
  const { data: profile } = useProfile(userId);
  const { data: member } = useMember(userId);

  const tier: Tier = (member?.tier as Tier) ?? "access";
  const showTrial = shouldShowTrial({ tier } as any);

  const params = useSearchParams();

  const supabase = useMemo(
    () =>
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  // Form state (schema has no phone column)
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedOnce, setSavedOnce] = useState(false);
  const [error, setError] = useState("");

  // UI helpers
  const [copied, setCopied] = useState(false);
  const accessCta = showTrial ? TRIAL_COPY : "Become a Member (£2.99/mo)";

  // Activation overlay state
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [pendingInfo, setPendingInfo] = useState<string>("");
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0); // seconds

  // Prefill once profile lands
  useEffect(() => {
    if (!profile) return;
    setName(profile.name ?? "");
  }, [profile]);

  const maskedId = (id?: string) => (id ? `${id.slice(0, 6)}…${id.slice(-4)}` : "—");

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

  function skipForNow() {
    track("welcome_skip", { tier });
    window.location.href = tier === "access" ? "/offers" : "/account";
  }

  // Handle checkout return → show activation overlay and send first magic link
  useEffect(() => {
    const sessionId = params.get("session_id");
    const pending = params.get("pending") === "1";
    if (!sessionId || !pending || userId) return; // only for not-signed-in return

    (async () => {
      try {
        setPendingInfo("Finalising your membership…");
        const res = await fetch(
          `${API_BASE}/api/claim?session_id=${encodeURIComponent(sessionId)}`
        );
        if (!res.ok) throw new Error("Could not retrieve checkout session");
        const { email } = (await res.json()) as { email?: string };
        if (!email) throw new Error("No email returned for session");
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
      } catch (e: any) {
        setPendingInfo(
          e?.message || "We couldn’t start activation automatically. Please check your email."
        );
        setCountdown(0);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, userId]);

  // After the user signs in (overlay goes away), finalise Stripe→Supabase link (idempotent)
  const finalisedRef = useRef(false);
  useEffect(() => {
    if (finalisedRef.current) return;
    const sessionId = params.get("session_id");
    const pending = params.get("pending") === "1";
    if (!userId || !sessionId || !pending) return;

    finalisedRef.current = true;
    (async () => {
      try {
        await fetch(`${API_BASE}/api/link-subscription-by-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: userId, session_id: sessionId }),
        });
        // UI will naturally re-render as hooks refetch (or on focus)
      } catch {
        // non-blocking; user still signed in as ACCESS until next refetch
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, params]);

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

  const canResend = countdown === 0 && !!pendingEmail;

  // Lock scroll while overlay is visible
  const showActivationOverlay = !userId && params.get("pending") === "1" && !!pendingEmail;
  useEffect(() => {
    if (!showActivationOverlay) return;
    const { body } = document;
    const prev = body.style.overflow;
    body.style.overflow = "hidden";
    return () => {
      body.style.overflow = prev;
    };
  }, [showActivationOverlay]);

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
                onClick={skipForNow}
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