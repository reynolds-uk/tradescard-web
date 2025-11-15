// tradescard-web/app/welcome/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import PrimaryButton from "@/components/PrimaryButton";
import { shouldShowTrial, TRIAL_COPY } from "@/lib/trial";
import { track } from "@/lib/track";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowserClient";
import { API_BASE, SITE_URL } from "@/lib/config";

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

const APP_URL = SITE_URL;

/* -------------------------------------------------------------------------------------------------
   Hook: confirm checkout with polling (handles ?cs=... or ?session_id=..., sends OTP if not signed in)

   IMPORTANT CHANGE:
   - If the confirm endpoint *never* returns 401 but only `{ pending: true }`,
     we now fall back to sending the magic link anyway (once per session/email)
     and stop polling, instead of spinning indefinitely.
-------------------------------------------------------------------------------------------------- */
function useConfirmCheckoutWithPolling(alreadyPaid: boolean) {
  const params = useSearchParams();
  const router = useRouter();

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Activation overlay state
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [pendingInfo, setPendingInfo] = useState<string>("");
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0); // seconds

  const supabase = useMemo(getSupabaseBrowserClient, []);

  // Track first render
  const tracked = useRef(false);
  useEffect(() => {
    if (!tracked.current) {
      tracked.current = true;
      track("welcome_view");
    }
  }, []);

  useEffect(() => {
    // Support either ?session_id= or ?cs=
    const rawSessionId = params.get("session_id") ?? params.get("cs");
    const pendingFlag = params.get("pending");
    const sessionId = rawSessionId ?? "";

    if (!sessionId || pendingFlag !== "1") return;

    // If we already know this user is on a paid tier, just clean up the URL
    // and skip all the confirm / magic-link logic for this tab.
    if (alreadyPaid) {
      router.replace("/welcome");
      return;
    }

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 20; // safeguard – but we now bail earlier when we send the link

    async function sendMagicLinkForSession() {
      // Look up the email used for this checkout session
      const s = await fetch(
        `${API_BASE}/api/checkout/session?session_id=${encodeURIComponent(
          sessionId,
        )}`,
      );
      if (!s.ok) {
        throw new Error("Could not retrieve checkout session details.");
      }

      const { email } = (await s.json()) as { email?: string };
      if (!email) {
        throw new Error("We couldn’t determine your email for activation.");
      }

      const normalisedEmail = email.trim().toLowerCase();
      setPendingEmail(normalisedEmail);

      // Only send the *first* magic link automatically for this
      // checkout session in this browser. Further refreshes of this
      // tab won't keep re-sending.
      const sendKey = `checkout_activation_sent_${sessionId}_${normalisedEmail}`;
      if (!window.localStorage.getItem(sendKey)) {
        const { error: otpErr } = await supabase.auth.signInWithOtp({
          email: normalisedEmail,
          options: {
            emailRedirectTo: new URL("/welcome", APP_URL).toString(),
          },
        });
        if (otpErr) throw otpErr;

        window.localStorage.setItem(sendKey, "1");
      }

      setPendingInfo(
        "We’ve emailed you a secure sign-in link. Open it to activate your account.",
      );
      setCountdown(30);
    }

    async function poll() {
      if (cancelled) return;
      attempts += 1;
      setBusy(true);
      setErr(null);

      try {
        const res = await fetch(
          `${API_BASE}/api/confirm-checkout?cs=${encodeURIComponent(
            sessionId,
          )}`,
          {
            credentials: "include",
          },
        );

        // 401 = API says “membership is ready, but user must sign in”
        if (res.status === 401) {
          setPendingInfo("Finalising your membership…");
          await sendMagicLinkForSession();
          // We’ve handed off to email, no more polling for this tab
          return;
        }

        const data = await res.json().catch(() => ({}));

        if (data?.ok) {
          track("welcome_view", { confirmed: true });
          // Drop handled params and refresh data
          router.replace("/welcome");
          router.refresh?.();
          return;
        }

        if (data?.pending) {
          // Payment / membership sync is still catching up.
          // Fallback: still send a magic link so the user can complete sign-in,
          // and *stop polling* for this tab.
          track("welcome_view", { pending: true });
          setPendingInfo("We’re setting up your membership. This usually takes a few seconds…");

          await sendMagicLinkForSession();
          return;
        }

        if (data?.error) {
          setErr(data.error);
        } else {
          setErr("We couldn’t confirm your membership.");
        }

        // If we got here and still have attempts left, we can retry a bit,
        // but this path should be rare.
        if (attempts < maxAttempts && !cancelled) {
          setTimeout(poll, 3000);
        }
      } catch (e: any) {
        setErr(e?.message || "Network error confirming checkout.");
        if (attempts < maxAttempts && !cancelled) {
          setTimeout(poll, 3000);
        }
      } finally {
        setBusy(false);
      }
    }

    // Start polling once
    poll();

    return () => {
      cancelled = true;
    };
  }, [params, router, supabase, alreadyPaid]);

  // Cooldown tick
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(
      () => setCountdown((c) => (c > 0 ? c - 1 : 0)),
      1000,
    );
    return () => clearInterval(t);
  }, [countdown]);

  // Resend magic link (explicit user action – allowed even if we've sent one before)
  const resend = async () => {
    if (!pendingEmail || countdown > 0 || resending) return;
    setResending(true);
    setCountdown(30);
    try {
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email: pendingEmail,
        options: {
          emailRedirectTo: new URL("/welcome", APP_URL).toString(),
        },
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

  // Local override so we can immediately reflect linked Pro/Member tier
  const [linkedTierOverride, setLinkedTierOverride] = useState<Tier | null>(
    null,
  );

  const effectiveTier: Tier =
    linkedTierOverride ?? ((member?.tier as Tier) ?? "access");
  const showTrial = shouldShowTrial({ tier: effectiveTier } as any);
  const isPaidTier = effectiveTier !== "access";

  const params = useSearchParams();
  const router = useRouter();

  const supabase = useMemo(getSupabaseBrowserClient, []);

  // Confirm checkout if `?cs=` or `?session_id=`
  const {
    busy,
    err,
    showActivationOverlay,
    pendingEmail,
    pendingInfo,
    resend,
    resending,
    countdown,
    canResend,
  } = useConfirmCheckoutWithPolling(isPaidTier);

  // After sign-in: link Stripe subscription → Supabase user (if needed)
  const linkAttemptedRef = useRef(false);
  useEffect(() => {
    if (linkAttemptedRef.current) return;
    if (!profile?.email) return;

    // If we already know this user has a paid tier, nothing to do
    if (member?.tier && member.tier !== "access") return;

    linkAttemptedRef.current = true;

    (async () => {
      try {
        const res = await fetch(
          `${API_BASE}/api/link-subscription-by-email`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: profile.email }),
          },
        );

        if (!res.ok) return;
        const data = (await res.json()) as {
          linked?: boolean;
          tier?: string;
        };

        if (data.linked && data.tier && data.tier !== "access") {
          setLinkedTierOverride(data.tier as Tier);
        }
      } catch (e) {
        console.warn("link-subscription-by-email failed", e);
        // allow retry on next mount if needed
        linkAttemptedRef.current = false;
      }
    })();
  }, [profile?.email, member?.tier]);

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

  const maskedId = (id?: string) =>
    id ? `${id.slice(0, 6)}…${id.slice(-4)}` : "—";

  // “Resume checkout” if they came back with continue=1 and still on Access
  const wantedPlan =
    (params.get("plan") as "member" | "pro" | null) || null;
  const wantedCycle =
    (params.get("cycle") as "month" | "year" | null) || null;
  const showResume =
    params.get("continue") === "1" &&
    effectiveTier === "access" &&
    wantedPlan &&
    wantedCycle;

  async function resumeCheckout() {
    try {
      const res = await fetch(`/api/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ plan: wantedPlan, cycle: wantedCycle }),
      });
      const data = await res.json();
      if (!res.ok || !data?.url)
        throw new Error(data?.error || "Could not start checkout.");
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
          { onConflict: "user_id" },
        );

      if (upErr) throw upErr;

      setSavedOnce(true);
      track("welcome_profile_saved", { tier: effectiveTier });

      window.location.href =
        effectiveTier === "access" ? "/offers" : "/account";
    } catch (e: any) {
      setError(e?.message || "We couldn’t save your details just now.");
    } finally {
      setSaving(false);
    }
  }

  const showInlinePending =
    busy && !showActivationOverlay && !pendingEmail;

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
        {(showInlinePending || err || showResume) && (
          <div className="mb-4 space-y-2">
            {showInlinePending && (
              <div className="rounded-lg border border-blue-400/30 bg-blue-500/10 px-3 py-2 text-blue-200 text-sm">
                Activating your membership…
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

        {shouldShowTrial({ tier: effectiveTier } as any) && (
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
              <div className="mt-1 text-sm text-neutral-300">
                {profile?.email ?? "—"}
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="rounded-lg border border-neutral-800 p-3 text-center">
                  <div className="text-xl font-semibold">
                    {TIER_COPY[effectiveTier].label}
                  </div>
                  <div className="mt-1 text-xs text-neutral-400">Tier</div>
                </div>

                <div className="rounded-lg border border-neutral-800 p-3 text-center">
                  <div className="text-xl font-semibold truncate">
                    {maskedId(userId ?? undefined)}
                  </div>
                  <div className="mt-1 text-xs text-neutral-400">
                    Card ID
                  </div>
                </div>

                <div className="rounded-lg border border-neutral-800 p-3 text-center">
                  <button
                    onClick={copyCardId}
                    className="rounded bg-neutral-800 px-3 py-1 text-sm hover:bg-neutral-700 disabled:opacity-50"
                    disabled={!userId}
                  >
                    {copied ? "Copied ✓" : "Copy ID"}
                  </button>
                  <div className="mt-1 text-xs text-neutral-400">
                    For support & verification
                  </div>
                </div>
              </div>
            </div>

            {/* Next steps quick links */}
            <aside className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
              <div className="font-medium">What next?</div>
              <p className="mt-1 text-sm text-neutral-300">
                {TIER_COPY[effectiveTier].blurb}
              </p>

              <div className="mt-3 grid gap-2">
                <Link href="/offers" className="block">
                  <PrimaryButton className="w-full">
                    Browse offers
                  </PrimaryButton>
                </Link>

                {effectiveTier !== "access" ? (
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
                    <PrimaryButton
                      onClick={() => goJoin("member")}
                      className="w-full"
                    >
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
            We’ll use this for support and rewards notifications. We never
            spam.
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
              <label
                htmlFor="name"
                className="block text-xs text-neutral-400 mb-1"
              >
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
              {effectiveTier === "access"
                ? "Save & continue to offers"
                : "Save & go to my account"}
            </PrimaryButton>
            {effectiveTier === "access" && (
              <button
                type="button"
                onClick={() => {
                  track("welcome_skip", { tier: effectiveTier });
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
