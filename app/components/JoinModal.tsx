"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

type Props = {
  open: boolean;
  onClose: () => void;
  onJoinFree: () => void;
  onMember: () => Promise<void>;
  onPro: () => Promise<void>;
  busy?: boolean;
  /** Only real errors from checkout/portal should be passed in here */
  error?: string;
};

function Badge({ children }: { children: string }) {
  return (
    <span className="rounded bg-neutral-800 px-2 py-0.5 text-xs">
      {children}
    </span>
  );
}

function Notice({
  tone = "info",
  children,
}: {
  tone?: "info" | "success" | "error";
  children: string;
}) {
  const tones = {
    info: "border-amber-400/40 bg-amber-400/10 text-amber-200",
    success: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
    error: "border-red-600/40 bg-red-900/10 text-red-300",
  } as const;
  return (
    <div className={`mt-3 rounded border px-3 py-2 text-sm ${tones[tone]}`}>
      {children}
    </div>
  );
}

export default function JoinModal({
  open,
  onClose,
  onJoinFree,
  onMember,
  onPro,
  busy = false,
  error,
}: Props) {
  const supabase = useMemo<SupabaseClient | null>(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    if (!url || !key) return null;
    return createClient(url, key);
  }, []);

  // session state
  const [signedIn, setSignedIn] = useState(false);

  // email / magic-link state (modal-local)
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [emailErr, setEmailErr] = useState<string>("");

  const emailRef = useRef<HTMLInputElement | null>(null);

  // initialise session + prefill email from localStorage
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (supabase) {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        setSignedIn(!!data?.session?.user);
      }
      const saved = typeof window !== "undefined" ? localStorage.getItem("tc:lastEmail") : null;
      if (saved && !email) setEmail(saved);
    })();
    return () => {
      mounted = false;
    };
  }, [supabase, email]);

  // util: validate & send magic link
  const sendMagic = async () => {
    if (!supabase) {
      setEmailErr("Auth initialisation failed.");
      return;
    }
    setEmailErr("");
    const trimmed = email.trim();
    if (!trimmed || !/^\S+@\S+\.\S+$/.test(trimmed)) {
      setEmailErr("Enter a valid email address.");
      return;
    }
    try {
      setSending(true);
      if (typeof window !== "undefined") localStorage.setItem("tc:lastEmail", trimmed);
      const base =
        process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
        (typeof window !== "undefined" ? window.location.origin : "");
      const { error: e } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: { emailRedirectTo: `${base}/auth/callback` },
      });
      if (e) throw e;
      setSentTo(trimmed);
    } catch (e: unknown) {
      setEmailErr(e instanceof Error ? e.message : "Failed to send link.");
    } finally {
      setSending(false);
    }
  };

  // when a plan is clicked and the user isn't signed in, focus email box instead of doing nothing
  const ensureSignedIn = async (action: () => Promise<void>) => {
    if (signedIn) {
      await action();
      return;
    }
    // nudge: focus email input and show info if not already sent
    if (!sentTo) {
      emailRef.current?.focus();
      setEmailErr(""); // clear hard error
      // show a gentle info via sentTo=null + we’ll render a hint below the field
    }
  };

  if (!open) return null;

  return (
    <div
      aria-modal="true"
      role="dialog"
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
    >
      {/* backdrop */}
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/60"
      />
      {/* panel */}
      <div className="relative w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl border border-neutral-800 bg-neutral-900 p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Join TradesCard</h3>
          <button
            onClick={onClose}
            className="rounded px-2 py-1 text-sm bg-neutral-800 hover:bg-neutral-700"
          >
            Close
          </button>
        </div>

        <p className="mt-2 text-sm text-neutral-400">
          Pick a plan for protection, early deals and rewards — or join free and upgrade any time.
        </p>

        {/* Email capture (visible when not signed in). Always available at the top */}
        {!signedIn && (
          <div className="mt-3">
            <label htmlFor="join-email" className="sr-only">
              Email address
            </label>
            <div className="flex gap-2">
              <input
                id="join-email"
                ref={emailRef}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="flex-1 rounded border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm"
                inputMode="email"
                autoComplete="email"
              />
              <button
                onClick={sendMagic}
                disabled={sending}
                className="rounded bg-neutral-200 text-neutral-900 text-sm px-3 py-2 disabled:opacity-60"
              >
                {sending ? "Sending…" : "Send sign-in link"}
              </button>
            </div>
            {emailErr && <Notice tone="error">{emailErr}</Notice>}
            {sentTo && (
              <Notice tone="success">
                Magic link sent to <strong>{sentTo}</strong>. Open it on this device, then return here to continue.
              </Notice>
            )}
            {!emailErr && !sentTo && (
              <Notice tone="info">Enter your email to get a sign-in link. Then choose your plan.</Notice>
            )}
          </div>
        )}

        {error && <Notice tone="error">{error}</Notice>}

        <div className="mt-4 grid gap-3">
          {/* Member */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
            <div className="flex items-center justify-between">
              <div className="font-medium">Member</div>
              <div className="text-sm text-neutral-400">£2.99/mo</div>
            </div>
            <ul className="mt-2 text-sm text-neutral-300 space-y-1">
              <li>• Full offer access</li>
              <li>• Protect Lite benefits</li>
              <li>• Monthly prize entry</li>
              <li>• Digital card</li>
            </ul>
            <button
              onClick={() => ensureSignedIn(onMember)}
              disabled={busy}
              className="mt-3 inline-block rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm hover:bg-neutral-800 disabled:opacity-60"
            >
              {busy ? "Opening…" : signedIn ? "Choose Member" : "Sign in then continue"}
            </button>
          </div>

          {/* Pro */}
          <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 p-4 ring-1 ring-amber-400/30">
            <div className="flex items-center justify-between">
              <div className="font-medium">Pro</div>
              <div className="text-sm text-amber-300">£7.99/mo</div>
            </div>
            <ul className="mt-2 text-sm text-neutral-200 space-y-1">
              <li>• Everything in Member</li>
              <li>• Early-access deals & Pro-only offers</li>
              <li>• Double prize entries</li>
            </ul>
            <button
              onClick={() => ensureSignedIn(onPro)}
              disabled={busy}
              className="mt-3 inline-block rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm hover:bg-neutral-800 disabled:opacity-60"
            >
              {busy ? "Opening…" : signedIn ? "Choose Pro" : "Sign in then continue"}
            </button>
          </div>

          {/* Free */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
            <div className="flex items-center gap-2">
              <div className="font-medium">Join free</div>
              <Badge>FREE</Badge>
            </div>
            <p className="mt-1 text-sm text-neutral-400">
              Sign in to browse and redeem offers. Upgrade any time for benefits and rewards.
            </p>
            <button
              onClick={() => (signedIn ? onJoinFree() : sendMagic())}
              className="mt-3 inline-block rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm hover:bg-neutral-800"
            >
              {signedIn ? "Continue free" : sending ? "Sending…" : "Sign in / Join free"}
            </button>
          </div>
        </div>

        <div className="mt-4 text-[12px] text-neutral-500">
          No purchase necessary. Free postal entry route is available on public promo pages.
          Paid and free routes are treated equally in draws.
        </div>
      </div>
    </div>
  );
}