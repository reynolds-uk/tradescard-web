// app/header-client.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

type Tier = "access" | "member" | "pro";

type AccountShape = {
  user_id: string;
  email: string;
  full_name?: string | null;
  members: null | {
    status: string; // active | trialing | past_due | canceled | free
    tier: Tier | string;
    current_period_end: string | null;
  };
};

const isBrowser = typeof window !== "undefined";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://tradescard-api.vercel.app";

function classNames(...xs: Array<string | false | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export default function HeaderAuth() {
  // ---- Supabase (guarded so we never build it on the server) ----
  const supabase = useMemo<SupabaseClient | null>(() => {
    if (!isBrowser) return null;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    if (!url || !key) return null;
    return createClient(url, key);
  }, []);

  // ---- Auth / account state ----
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [tier, setTier] = useState<Tier>("access");
  const [status, setStatus] = useState<string>("free");

  // ---- Sign-in form state ----
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string>("");
  const [cooldown, setCooldown] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // ---- Menu state ----
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Expose a way for “Join free” links to focus the email box
  useEffect(() => {
    if (!isBrowser) return;
    (window as any).tradescardFocusSignin = () => {
      inputRef.current?.focus();
      inputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    };
    return () => {
      (window as any).tradescardFocusSignin = undefined;
    };
  }, []);

  // Prefill email from localStorage (handy on mobile)
  useEffect(() => {
    if (!isBrowser) return;
    const saved = localStorage.getItem("tc:lastEmail");
    if (saved) setEmail(saved);
  }, []);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, [menuOpen]);

  // Cooldown timer for “Send magic link”
  useEffect(() => {
    if (!cooldown) return;
    const t = setInterval(() => setCooldown((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  // Fetch current account (tier/status)
  const refreshAccount = useCallback(
    async (uid: string) => {
      try {
        const r = await fetch(
          `${API_BASE}/api/account?user_id=${encodeURIComponent(uid)}`,
          { cache: "no-store" }
        );
        if (!r.ok) throw new Error(`/api/account ${r.status}`);
        const a: AccountShape = await r.json();
        const t = (a.members?.tier as Tier) ?? "access";
        const s = a.members?.status ?? (t === "access" ? "free" : "inactive");
        setTier(t);
        setStatus(s);
        setSessionEmail(a.email);
      } catch {
        // Be forgiving if the API briefly fails; show “free” state
        setTier("access");
        setStatus("free");
      }
    },
    []
  );

  // Initial session + subscribe to auth changes
  useEffect(() => {
    (async () => {
      try {
        if (!supabase) return setLoading(false);
        const { data } = await supabase.auth.getSession();
        const u = data?.session?.user ?? null;
        if (u) {
          setUserId(u.id);
          setSessionEmail(u.email ?? null);
          await refreshAccount(u.id);
        } else {
          setUserId(null);
          setSessionEmail(null);
          setTier("access");
          setStatus("free");
        }
      } finally {
        setLoading(false);
      }
    })();

    if (!supabase) return;
    const { data: sub } = supabase.auth.onAuthStateChange(async (_evt, sess) => {
      const u = sess?.user ?? null;
      if (u) {
        setUserId(u.id);
        setSessionEmail(u.email ?? null);
        await refreshAccount(u.id);
      } else {
        setUserId(null);
        setSessionEmail(null);
        setTier("access");
        setStatus("free");
      }
    });
    return () => {
      sub?.subscription?.unsubscribe();
    };
  }, [supabase, refreshAccount]);

  // Send passwordless link
  const sendMagic = async () => {
    setErr("");
    setSent(false);
    if (!supabase) {
      setErr("Auth initialisation failed.");
      return;
    }
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setErr("Enter a valid email address.");
      return;
    }
    try {
      if (isBrowser) localStorage.setItem("tc:lastEmail", email.trim());
      const base =
        process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
        (isBrowser ? window.location.origin : "");
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: `${base}/auth/callback` },
      });
      if (error) throw error;
      setSent(true);
      setCooldown(30);
    } catch (e: any) {
      setErr(e.message || "Failed to send link.");
    }
  };

  const signOut = async () => {
    try {
      await supabase?.auth.signOut();
    } finally {
      setMenuOpen(false);
      // Full reload to reset any client state
      if (isBrowser) window.location.href = "/";
    }
  };

  const goUpgrade = () => {
    if (isBrowser) window.location.href = "/account#upgrade";
  };
  const goManage = () => {
    if (isBrowser) window.location.href = "/account#billing";
  };

  // ---------- Render ----------
  if (loading) {
    return <div className="text-xs text-neutral-400">Loading…</div>;
  }

  // Not signed in → explicit, compact email box
  if (!userId) {
    return (
      <div className="flex items-center gap-2" id="signup">
        <span className="hidden md:inline text-xs text-neutral-400">
          Sign in <span className="opacity-60">or</span> create free account
        </span>
        <input
          ref={inputRef}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          className="px-2 py-1 rounded bg-neutral-900 border border-neutral-800 text-sm"
          aria-label="Email address"
          inputMode="email"
          autoComplete="email"
        />
        <button
          onClick={sendMagic}
          disabled={cooldown > 0}
          className={classNames(
            "px-3 py-1 rounded text-sm",
            cooldown > 0
              ? "bg-neutral-800 text-neutral-400 cursor-not-allowed"
              : "bg-neutral-200 text-neutral-900 hover:bg-neutral-300"
          )}
        >
          {cooldown > 0 ? `Resend in ${cooldown}s` : "Send magic link"}
        </button>
        {sent && <span className="text-xs text-neutral-400">Check your email…</span>}
        {err && <span className="text-xs text-red-400">Error: {err}</span>}
      </div>
    );
  }

  // Signed in → user chip + actions
  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setMenuOpen((v) => !v)}
        className="flex items-center gap-2 rounded bg-neutral-900 border border-neutral-800 px-3 py-1 text-sm hover:border-neutral-700"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
      >
        <div className="h-5 w-5 rounded bg-neutral-700" aria-hidden />
        <div className="hidden sm:flex flex-col items-start leading-tight">
          <span className="text-xs text-neutral-300">
            {sessionEmail ?? "Signed in"}
          </span>
          <span
            className={classNames(
              "text-[10px] rounded px-1 py-px",
              tier === "member" && "bg-green-900/30 text-green-300",
              tier === "pro" && "bg-amber-900/30 text-amber-300",
              tier === "access" && "bg-neutral-800 text-neutral-300"
            )}
          >
            {tier === "access" ? "ACCESS (Free)" : tier.toUpperCase()}
            {status && tier !== "access" ? ` · ${status}` : ""}
          </span>
        </div>
        <svg width="16" height="16" viewBox="0 0 20 20" aria-hidden>
          <path d="M5 7l5 5 5-5" fill="none" stroke="currentColor" />
        </svg>
      </button>

      {menuOpen && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-56 rounded border border-neutral-800 bg-neutral-950 shadow-lg"
        >
          <a
            href="/account"
            role="menuitem"
            className="block px-3 py-2 text-sm hover:bg-neutral-900"
            onClick={() => setMenuOpen(false)}
          >
            My account
          </a>

          {/* Contextual CTA depending on tier */}
          {tier === "access" ? (
            <button
              role="menuitem"
              onClick={goUpgrade}
              className="w-full text-left px-3 py-2 text-sm hover:bg-neutral-900"
            >
              Upgrade to Member / Pro
            </button>
          ) : (
            <button
              role="menuitem"
              onClick={goManage}
              className="w-full text-left px-3 py-2 text-sm hover:bg-neutral-900"
            >
              Manage billing
            </button>
          )}

          <a
            href="/rewards"
            role="menuitem"
            className="block px-3 py-2 text-sm hover:bg-neutral-900"
            onClick={() => setMenuOpen(false)}
          >
            Rewards
          </a>

          <div className="my-1 border-t border-neutral-900" />

          <button
            role="menuitem"
            onClick={signOut}
            className="w-full text-left px-3 py-2 text-sm hover:bg-neutral-900"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}