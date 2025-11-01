// app/header-client.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://tradescard-api.vercel.app";

type AccountShape = {
  user_id: string;
  email: string;
  full_name?: string | null;
  members: null | {
    status: string; // active | trialing | past_due | canceled | free
    tier: "access" | "member" | "pro" | string;
    current_period_end: string | null;
  };
};

export default function HeaderAuth() {
  const supabase = useMemo(
    () =>
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [tier, setTier] = useState<"access" | "member" | "pro">("access");
  const [status, setStatus] = useState<string>("free");
  const [loading, setLoading] = useState(true);

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string>("");

  const [menuOpen, setMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Expose a simple way for “Join free” links to focus the email box
  useEffect(() => {
    (window as any).tradescardFocusSignin = () => {
      inputRef.current?.focus();
      inputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    };
    return () => {
      (window as any).tradescardFocusSignin = undefined;
    };
  }, []);

  async function refreshAccount(uid: string) {
    try {
      const r = await fetch(`${API_BASE}/api/account?user_id=${encodeURIComponent(uid)}`, {
        cache: "no-store",
      });
      if (!r.ok) throw new Error(`/api/account ${r.status}`);
      const a: AccountShape = await r.json();
      const t = (a.members?.tier as "access" | "member" | "pro") ?? "access";
      const s = a.members?.status ?? "free";
      setTier(t);
      setStatus(s);
      setSessionEmail(a.email);
    } catch (e) {
      // fall back to “access/free” if account lookup fails
      setTier("access");
      setStatus("free");
    }
  }

  // Initial session + live updates on auth state change
  useEffect(() => {
    (async () => {
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
      setLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, s) => {
      const u = s?.user ?? null;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendMagic = async () => {
    setErr("");
    setSent(false);
    try {
      const base =
        process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
        window.location.origin;

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${base}/auth/callback`,
        },
      });
      if (error) throw error;
      setSent(true);
    } catch (e: any) {
      setErr(e.message || "Failed to send link");
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setMenuOpen(false);
    // hard refresh to ensure all pages reset state
    window.location.href = "/";
  };

  if (loading) {
    return (
      <div className="text-xs text-neutral-400">Loading…</div>
    );
  }

  // NOT SIGNED IN → show explicit “Sign in or create free account”
  if (!userId) {
    return (
      <div className="flex items-center gap-2" id="signup">
        <div className="hidden md:block text-xs text-neutral-400">
          Sign in <span className="opacity-60">or</span> create free account
        </div>
        <input
          ref={inputRef}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          className="px-2 py-1 rounded bg-neutral-900 border border-neutral-800 text-sm"
          aria-label="Email address"
        />
        <button
          onClick={sendMagic}
          className="px-3 py-1 rounded bg-neutral-200 text-neutral-900 hover:bg-neutral-300 text-sm"
        >
          Send magic link
        </button>
        {sent && <span className="text-xs text-neutral-400">Check your email…</span>}
        {err && <span className="text-xs text-red-400">Error: {err}</span>}
      </div>
    );
  }

  // SIGNED IN → show compact user chip with tier + menu
  return (
    <div className="relative">
      <button
        onClick={() => setMenuOpen((v) => !v)}
        className="flex items-center gap-2 rounded bg-neutral-900 border border-neutral-800 px-3 py-1 text-sm hover:border-neutral-700"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
      >
        <div className="h-5 w-5 rounded bg-neutral-700" aria-hidden />
        <div className="hidden sm:flex flex-col items-start leading-tight">
          <span className="text-xs text-neutral-300">{sessionEmail ?? "Signed in"}</span>
          <span
            className={`text-[10px] rounded px-1 py-px ${
              tier === "member"
                ? "bg-green-900/30 text-green-300"
                : tier === "pro"
                ? "bg-amber-900/30 text-amber-300"
                : "bg-neutral-800 text-neutral-300"
            }`}
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
          className="absolute right-0 mt-2 w-48 rounded border border-neutral-800 bg-neutral-950 shadow-lg"
        >
          <a
            href="/account"
            role="menuitem"
            className="block px-3 py-2 text-sm hover:bg-neutral-900"
            onClick={() => setMenuOpen(false)}
          >
            My account
          </a>
          <a
            href="/rewards"
            role="menuitem"
            className="block px-3 py-2 text-sm hover:bg-neutral-900"
            onClick={() => setMenuOpen(false)}
          >
            Rewards
          </a>
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