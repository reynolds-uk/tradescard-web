// app/join/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";

type Billing = "monthly" | "annual";
type Tier = "access" | "member" | "pro";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://tradescard-api.vercel.app";

export default function JoinPage() {
  const supabase = useMemo(
    () =>
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const [billing, setBilling] = useState<Billing>("monthly");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [emailErr, setEmailErr] = useState("");
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      setSignedIn(!!data?.session?.user);
      const saved = localStorage.getItem("tc:lastEmail");
      if (saved && !email) setEmail(saved);
    })();
  }, [supabase, email]);

  function nextUrlFor(plan: "member" | "pro" | "free") {
    if (plan === "free") return "/welcome";
    return `/checkout?plan=${plan}&billing=${billing}`;
  }

  async function sendMagic(next: string) {
    try {
      setSending(true);
      setEmailErr("");
      const trimmed = email.trim();
      if (!trimmed || !/^\S+@\S+\.\S+$/.test(trimmed)) {
        setEmailErr("Enter a valid email address.");
        return;
      }
      localStorage.setItem("tc:lastEmail", trimmed);
      const base =
        process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
        window.location.origin;
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: { emailRedirectTo: `${base}/auth/callback?next=${encodeURIComponent(next)}` },
      });
      if (error) throw error;
      setSentTo(trimmed);
    } catch (e) {
      setEmailErr(e instanceof Error ? e.message : "Could not send link.");
    } finally {
      setSending(false);
    }
  }

  async function handlePaid(plan: "member" | "pro") {
    const next = nextUrlFor(plan);
    if (signedIn) {
      window.location.href = next;
      return;
    }
    await sendMagic(next);
  }

  async function handleFree() {
    const next = nextUrlFor("free");
    if (signedIn) {
      window.location.href = next;
      return;
    }
    await sendMagic(next);
  }

  return (
    <Container>
      <PageHeader
        title="Join TradesCard"
        subtitle="Join free, or pick a plan with protection, early deals and monthly rewards. Switch or cancel any time."
        aside={
          !signedIn ? (
            <button
              onClick={() => sendMagic("/welcome")}
              className="rounded bg-neutral-800 hover:bg-neutral-700 px-3 py-2"
            >
              Send sign-in link
            </button>
          ) : null
        }
      />

      {/* Billing toggle */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setBilling("monthly")}
          className={`px-3 py-1 rounded border ${billing === "monthly" ? "border-neutral-700 bg-neutral-900" : "border-neutral-900 bg-neutral-950 hover:bg-neutral-900"}`}
          aria-pressed={billing === "monthly"}
        >
          Monthly
        </button>
        <button
          onClick={() => setBilling("annual")}
          className={`px-3 py-1 rounded border ${billing === "annual" ? "border-neutral-700 bg-neutral-900" : "border-neutral-900 bg-neutral-950 hover:bg-neutral-900"}`}
          aria-pressed={billing === "annual"}
          title="Save about 2 months"
        >
          Annual <span className="text-xs text-neutral-400">(save ~2 months)</span>
        </button>
      </div>

      {/* Email capture (only when signed out) */}
      {!signedIn && (
        <div className="mb-5 rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
          <div className="text-sm text-neutral-300 mb-2">
            We’ll email you a sign-in link (no password needed).
          </div>
          <div className="flex gap-2">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              inputMode="email"
              autoComplete="email"
              placeholder="you@company.com"
              className="flex-1 rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
            />
            <button
              onClick={() => sendMagic("/welcome")}
              disabled={sending}
              className="rounded bg-neutral-200 text-neutral-900 text-sm px-3 py-2 disabled:opacity-60"
            >
              {sending ? "Sending…" : "Send link"}
            </button>
          </div>
          {emailErr && (
            <div className="mt-2 rounded border border-red-600/40 bg-red-900/10 px-3 py-2 text-sm text-red-300">
              {emailErr}
            </div>
          )}
          {sentTo && (
            <div className="mt-2 rounded border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
              Magic link sent to <strong>{sentTo}</strong>. Open it on this device, then you’ll continue.
            </div>
          )}
        </div>
      )}

      {/* Plan cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Member */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Member</h4>
            <span className="text-sm text-neutral-400">
              £2.99/mo <span className="text-xs">billed {billing}</span>
            </span>
          </div>
          <ul className="mt-3 space-y-1 text-sm text-neutral-300">
            <li>• Full offer access</li>
            <li>• Protect Lite benefits</li>
            <li>• Monthly prize entry</li>
            <li>• Digital card</li>
          </ul>
          <div className="mt-4">
            <button
              onClick={() => handlePaid("member")}
              className="inline-block rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm hover:bg-neutral-800"
            >
              {signedIn ? "Continue to checkout" : "Sign in, then continue"}
            </button>
          </div>
        </div>

        {/* Pro */}
        <div className="relative rounded-2xl border border-amber-400/40 bg-amber-400/10 p-5 ring-1 ring-amber-400/30">
          <span className="absolute right-3 -top-2 rounded bg-neutral-800 text-[11px] px-2 py-0.5">Best value</span>
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Pro</h4>
            <span className="text-sm text-amber-300">
              £7.99/mo <span className="text-xs text-amber-400">billed {billing}</span>
            </span>
          </div>
          <ul className="mt-3 space-y-1 text-sm text-neutral-200">
            <li>• Everything in Member</li>
            <li>• Early-access deals & Pro-only offers</li>
            <li>• Double prize entries</li>
          </ul>
          <div className="mt-4">
            <button
              onClick={() => handlePaid("pro")}
              className="inline-block rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm hover:bg-neutral-800"
            >
              {signedIn ? "Continue to checkout" : "Sign in, then continue"}
            </button>
          </div>
        </div>
      </div>

      {/* Access */}
      <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900/50 p-5">
        <div className="flex items-center gap-2">
          <h3 className="font-medium">Prefer to start free?</h3>
          <span className="rounded bg-neutral-800 px-2 py-0.5 text-xs">FREE</span>
        </div>
        <p className="text-sm text-neutral-400 mt-1">
          Join free, redeem offers when signed in, and upgrade any time for protection, early deals and rewards entries.
        </p>
        <div className="mt-3">
          <button
            onClick={handleFree}
            className="rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm hover:bg-neutral-800"
          >
            {signedIn ? "Continue" : "Sign in / Join free"}
          </button>
        </div>
      </div>

      <p className="mt-6 text-[12px] text-neutral-500">
        No purchase necessary. A free postal entry route is available on public promo pages. Paid and free routes are treated equally in draws.
      </p>
    </Container>
  );
}