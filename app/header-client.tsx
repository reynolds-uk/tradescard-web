// app/header-client.tsx
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { usePathname } from "next/navigation";
import { useJoinModal } from "./components/JoinModalContext";

type Tier = "access" | "member" | "pro";

type AccountShape = {
  user_id: string;
  email: string;
  full_name?: string | null;
  members: null | {
    status: "active" | "trialing" | "past_due" | "canceled" | "free" | string;
    tier: Tier | string;
    current_period_end: string | null;
  };
};

declare global {
  interface Window {
    /** Back-compat: previously focused the header email box; now opens Join modal */
    tradescardFocusSignin?: () => void;
  }
}

const isBrowser = typeof window !== "undefined";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://tradescard-api.vercel.app";

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export default function HeaderAuth() {
  const pathname = usePathname();

  // ---- Supabase (client-only) ----
  const supabase = useMemo<SupabaseClient | null>(() => {
    if (!isBrowser) return null;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    if (!url || !key) return null;
    return createClient(url, key);
  }, []);

  // ---- Join modal ----
  const { openJoin } = useJoinModal();

  // ---- Auth / account state ----
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [tier, setTier] = useState<Tier>("access");
  const [status, setStatus] = useState<string>("free");

  // ---- Menu state ----
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // track in-flight account request to prevent races
  const accountAbortRef = useRef<AbortController | null>(null);

  // Back-compat: legacy callers can still trigger join
  useEffect(() => {
    if (!isBrowser) return;
    window.tradescardFocusSignin = () => openJoin("access");
    return () => {
      window.tradescardFocusSignin = undefined;
    };
  }, [openJoin]);

  // Close menu on outside click & Escape
  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  // Fetch current account (tier/status) with abort protection
  const refreshAccount = useCallback(async (uid: string) => {
    try {
      accountAbortRef.current?.abort();
      accountAbortRef.current = new AbortController();

      const r = await fetch(
        `${API_BASE}/api/account?user_id=${encodeURIComponent(uid)}`,
        { cache: "no-store", signal: accountAbortRef.current.signal }
      );
      if (!r.ok) throw new Error(`/api/account ${r.status}`);
      const a: AccountShape = await r.json();
      const t = (a.members?.tier as Tier) ?? "access";
      const s = a.members?.status ?? (t === "access" ? "free" : "inactive");
      setTier(t);
      setStatus(s);
      setSessionEmail(a.email);
    } catch (e: unknown) {
      const isAbort =
        (typeof DOMException !== "undefined" &&
          e instanceof DOMException &&
          e.name === "AbortError") ||
        ((e as { name?: string } | null)?.name === "AbortError");
      if (isAbort) return;

      setTier("access");
      setStatus("free");
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.warn("refreshAccount failed", e);
      }
    }
  }, []);

  // Initial session + subscribe to auth changes
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        if (!supabase) {
          if (mounted) setLoading(false);
          return;
        }
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
        if (mounted) setLoading(false);
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
      mounted = false;
      sub?.subscription?.unsubscribe();
      accountAbortRef.current?.abort();
    };
  }, [supabase, refreshAccount]);

  const signOut = useCallback(async () => {
    try {
      await supabase?.auth.signOut();
    } finally {
      setMenuOpen(false);
      if (isBrowser) window.location.href = "/";
    }
  }, [supabase]);

  const goUpgrade = useCallback(() => {
    if (isBrowser) window.location.href = "/account#upgrade";
  }, []);
  const goManage = useCallback(() => {
    if (isBrowser) window.location.href = "/account#billing";
  }, []);

  // ---------- Render ----------

  // Skeleton while auth initialises
  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-8 w-28 animate-pulse rounded bg-neutral-900 border border-neutral-800" />
      </div>
    );
  }

  // Not signed in → always use modal (no inline email field)
  if (!userId) {
    // If on /join we bias to Member preselected; elsewhere default to Access
    const initialPlan = pathname === "/join" ? ("member" as const) : ("access" as const);

    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => openJoin(initialPlan)}
          className="px-3 py-1 rounded bg-neutral-200 text-neutral-900 text-sm hover:bg-neutral-300"
          aria-label="Sign in or join"
        >
          Sign in / Join
        </button>
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
        aria-controls="user-menu"
      >
        <div className="h-5 w-5 rounded bg-neutral-700" aria-hidden />
        <div className="hidden sm:flex flex-col items-start leading-tight">
          <span className="text-xs text-neutral-300">
            {sessionEmail ?? "Signed in"}
          </span>
          <span
            className={cx(
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
          id="user-menu"
          role="menu"
          className="absolute right-0 mt-2 w-56 rounded border border-neutral-800 bg-neutral-950 shadow-lg"
        >
          <Link
            href="/account"
            role="menuitem"
            className="block px-3 py-2 text-sm hover:bg-neutral-900"
            onClick={() => setMenuOpen(false)}
          >
            My account
          </Link>

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

          <Link
            href="/rewards"
            role="menuitem"
            className="block px-3 py-2 text-sm hover:bg-neutral-900"
            onClick={() => setMenuOpen(false)}
          >
            Rewards
          </Link>

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