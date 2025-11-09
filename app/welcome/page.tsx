// app/welcome/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import PrimaryButton from "@/components/PrimaryButton";
import { useMe } from "@/lib/useMe";
import { shouldShowTrial, TRIAL_COPY } from "@/lib/trial";
import { track } from "@/lib/track";

type Tier = "access" | "member" | "pro";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://tradescard-web.vercel.app";
const API_BASE = (process.env.NEXT_PUBLIC_API_BASE ??
  "https://tradescard-api.vercel.app").replace(/\/$/, "");

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

export default function WelcomePage() {
  const params = useSearchParams();
  const me = useMe(); // { ready, user?, tier?, status? }
  const user = me.user;
  const tier: Tier = (me.tier as Tier) ?? "access";

  const supabase = useMemo(
    () =>
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  // ---- Post-checkout activation (when redirected with session_id) ----
  const sessionId = params.get("session_id") || "";

  const [checkoutEmail, setCheckoutEmail] = useState<string>("");
  const [linkSent, setLinkSent] = useState(false);
  const [sendingLink, setSendingLink] = useState(false);
  const [linkErr, setLinkErr] = useState<string>("");

  // Fetch email from checkout session & auto-send magic link (only if not signed in)
  useEffect(() => {
    track("welcome_view");
    if (!sessionId || user?.id) return;

    let aborted = false;
    (async () => {
      try {
        const r = await fetch(
          `${API_BASE}/api/checkout/session?session_id=${encodeURIComponent(
            sessionId
          )}`,
          { cache: "no-store" }
        );
        const j = await r.json();
        const email = j?.email || "";
        if (aborted) return;

        if (!email) {
          setLinkErr("We couldn’t find your checkout email. Enter it below to resend.");
          return;
        }
        setCheckoutEmail(email);
        // Auto-send once
        await sendMagicLink(email);
      } catch {
        if (!aborted) {
          setLinkErr("We couldn’t fetch your checkout details. Enter your email to resend.");
        }
      }
    })();

    return () => {
      aborted = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, user?.id]);

  async function sendMagicLink(targetEmail: string) {
    const trimmed = (targetEmail || "").trim();
    if (!/\S+@\S+\.\S+/.test(trimmed)) {
      setLinkErr("Enter a valid email address.");
      return;
    }
    setSendingLink(true);
    setLinkErr("");
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          emailRedirectTo: `${APP_URL}/account?from=welcome`,
        },
      });
      if (error) throw error;
      setLinkSent(true);
    } catch (e: any) {
      setLinkErr(e?.message || "We couldn’t send your link. Please try again.");
      setLinkSent(false);
    } finally {
      setSendingLink(false);
    }
  }

  // ---- Profile form state (used only when signed in) ----
  const [name, setName] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [savedOnce, setSavedOnce] = useState(false);
  const [error, setError] = useState<string>("");

  // UI helpers
  const [copied, setCopied] = useState(false);
  const showTrial = shouldShowTrial(me as any);
  const accessCta = showTrial ? TRIAL_COPY : "Become a Member (£2.99/mo)";

  // Pre-fill from DB if the user exists
  useEffect(() => {
    if (!user?.id) return;

    let aborted = false;
    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("name, phone")
        .eq("user_id", user.id)
        .single();

      if (!aborted && !error && data) {
        setName(data.name ?? "");
        setPhone((data as any).phone ?? "");
      }
    })();

    return () => {
      aborted = true;
    };
  }, [user?.id, supabase]);

  function maskedId(id?: string) {
    return id ? `${id.slice(0, 6)}…${id.slice(-4)}` : "—";
  }

  function goJoin(plan: "member" | "pro") {
    try {
      localStorage.setItem("join_wanted_plan", plan);
    } catch {}
    track("welcome_cta_join_member", { plan, trial: showTrial });
    window.location.href = "/join";
  }

  async function copyCardId() {
    if (!user?.id) return;
    try {
      await navigator.clipboard.writeText(user.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* no-op */
    }
  }

  // Basic UK-ish phone validator (lenient)
  const isValidPhone = (v: string) => {
    const s = v.replace(/[\s\-\(\)]/g, "");
    return /^(\+?\d{10,15})$/.test(s);
    // Accepts +447..., 07..., etc.
  };

  async function saveAndContinue() {
    if (!user?.id) return;

    setError("");
    if ((tier === "member" || tier === "pro") && !isValidPhone(phone)) {
      setError("Please enter a valid mobile number so we can contact you about rewards.");
      return;
    }

    setSaving(true);
    try {
      const { error: upErr } = await supabase
        .from("profiles")
        .update({
          name: name || null,
          phone: phone || null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (upErr) throw upErr;

      setSavedOnce(true);
      // No custom event here to avoid type errors; navigation below is enough.

      if (tier === "access") window.location.href = "/offers";
      else window.location.href = "/account";
    } catch (e: any) {
      setError(e?.message || "We couldn’t save your details just now.");
    } finally {
      setSaving(false);
    }
  }

  function skipForNow() {
    // keep tracking to defined events only
    window.location.href = "/offers";
  }

  // ---------- Render ----------
  const isSignedOut = !user?.id;

  return (
    <Container>
      <PageHeader
        title="Welcome to TradeCard"
        subtitle={
          isSignedOut
            ? "Thanks for joining. Activate your account to finish setup."
            : "Here’s your card and a quick setup so we can serve you properly."
        }
        aside={
          showTrial ? (
            <span className="hidden sm:inline rounded bg-amber-400/20 text-amber-200 text-xs px-2 py-1 border border-amber-400/30">
              {TRIAL_COPY}
            </span>
          ) : undefined
        }
      />

      {/* If arriving from Stripe and signed out: show activation helper */}
      {isSignedOut && (
        <div className="mb-4 rounded-2xl border border-blue-400/30 bg-blue-500/10 p-4">
          <div className="text-sm text-blue-100">
            We’ve sent a secure sign-in link to your email. Click it to activate your account and
            we’ll link your membership automatically.
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
            <label htmlFor="welcome-email" className="sr-only">
              Email address
            </label>
            <input
              id="welcome-email"
              type="email"
              inputMode="email"
              value={checkoutEmail}
              onChange={(e) => setCheckoutEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
            />
            <PrimaryButton
              onClick={() => sendMagicLink(checkoutEmail)}
              disabled={sendingLink}
              className="text-sm"
            >
              {linkSent ? "Link sent ✓" : sendingLink ? "Sending…" : "Resend link"}
            </PrimaryButton>
          </div>

          {linkErr && (
            <div className="mt-3 rounded border border-red-600/40 bg-red-900/10 px-3 py-2 text-red-300 text-sm">
              {linkErr}
            </div>
          )}

          <div className="mt-2 text-xs text-neutral-300">
            After you click the link, you’ll land on your account with your membership ready to use.
          </div>
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
              {isSignedOut ? checkoutEmail || "—" : user?.email ?? "—"}
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="rounded-lg border border-neutral-800 p-3 text-center">
                <div className="text-xl font-semibold">{TIER_COPY[tier].label}</div>
                <div className="mt-1 text-xs text-neutral-400">Tier</div>
              </div>

              <div className="rounded-lg border border-neutral-800 p-3 text-center">
                <div className="text-xl font-semibold truncate">
                  {isSignedOut ? "—" : maskedId(user?.id)}
                </div>
                <div className="mt-1 text-xs text-neutral-400">Card ID</div>
              </div>

              <div className="rounded-lg border border-neutral-800 p-3 text-center">
                <button
                  onClick={copyCardId}
                  className="rounded bg-neutral-800 px-3 py-1 text-sm hover:bg-neutral-700 disabled:opacity-50"
                  disabled={!user?.id}
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
            <p className="mt-1 text-sm text-neutral-300">{TIER_COPY[tier].blurb}</p>

            <div className="mt-3 grid gap-2">
              <Link
                href="/offers"
                onClick={() => track("welcome_cta_offers", { tier })}
                className="block"
              >
                <PrimaryButton className="w-full">Browse offers</PrimaryButton>
              </Link>

              {tier !== "access" ? (
                <>
                  <Link
                    href="/benefits"
                    onClick={() => track("welcome_cta_benefits", { tier })}
                    className="block"
                  >
                    <button className="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-2 font-medium hover:bg-neutral-800">
                      See your benefits
                    </button>
                  </Link>
                  <Link
                    href="/rewards"
                    onClick={() => track("welcome_cta_rewards", { tier })}
                    className="block"
                  >
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

      {/* Onboarding form (hide when signed out) */}
      {!isSignedOut && (
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
            <div>
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

            <div>
              <label htmlFor="phone" className="block text-xs text-neutral-400 mb-1">
                Mobile number{" "}
                {tier === "member" || tier === "pro" ? (
                  <span className="text-amber-300">(required for paid)</span>
                ) : (
                  <span className="text-neutral-500">(optional)</span>
                )}
              </label>
              <input
                id="phone"
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
                placeholder="+44 7700 900123"
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
      )}
    </Container>
  );
}