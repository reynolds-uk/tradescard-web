// app/components/Nav.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useJoinModal } from "@/components/JoinModalContext";

type Tier = "access" | "member" | "pro";
type Me = { email: string; tier: Tier; status: string } | null;

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://tradescard-api.vercel.app";

const TRIAL_ACTIVE = process.env.NEXT_PUBLIC_TRIAL_ACTIVE === "true";
const TRIAL_COPY = process.env.NEXT_PUBLIC_TRIAL_COPY || "Try Member for £1 (90 days)";

export default function Nav() {
  const supabase = useMemo(
    () => createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ),
    []
  );
  const { openJoin } = useJoinModal();

  const [me, setMe] = useState<Me>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let aborted = false;
    (async () => {
      try {
        setLoading(true);
        const { data } = await supabase.auth.getSession();
        const user = data?.session?.user ?? null;
        if (!user) {
          if (!aborted) setMe(null);
          return;
        }
        const r = await fetch(`${API_BASE}/api/account?user_id=${encodeURIComponent(user.id)}`, {
          cache: "no-store",
        });
        if (!r.ok) throw new Error(`/api/account ${r.status}`);
        const a = await r.json();
        if (!aborted) {
          const tier = (a?.members?.tier as Tier) ?? "access";
          const status = a?.members?.status ?? (tier === "access" ? "free" : "inactive");
          setMe({ email: a?.email, tier, status });
        }
      } catch {
        if (!aborted) setMe(null);
      } finally {
        if (!aborted) setLoading(false);
      }
    })();
    return () => { aborted = true; };
  }, [supabase]);

  const showTrialChip = useMemo(() => {
    if (!TRIAL_ACTIVE) return false;
    if (!me) return true; // logged-out users see chip
    // hide for active Member/Pro
    return !(me.status === "active" && (me.tier === "member" || me.tier === "pro"));
  }, [me]);

  return (
    <nav className="sticky top-0 z-40 border-b border-neutral-900 bg-neutral-950/80 backdrop-blur supports-[backdrop-filter]:bg-neutral-950/60">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-4">
          <Link href="/" className="font-semibold">TradesCard</Link>
          <Link href="/offers" className="text-sm text-neutral-300 hover:text-white">Offers</Link>
          <Link href="/benefits" className="text-sm text-neutral-300 hover:text-white">Benefits</Link>
          <Link href="/rewards" className="text-sm text-neutral-300 hover:text-white">Rewards</Link>

          {showTrialChip && (
            <span className="hidden sm:inline rounded border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-xs text-amber-200">
              {TRIAL_COPY}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!loading && me ? (
            <>
              {me.tier !== "pro" && me.status !== "canceled" && (
                <button
                  onClick={() => openJoin("pro")}
                  className="rounded bg-neutral-900 px-3 py-1 text-sm hover:bg-neutral-800"
                  title={`You're ${me.tier}. Upgrade to Pro.`}
                >
                  Upgrade
                </button>
              )}
              <Link
                href="/account"
                className="rounded bg-amber-400 px-3 py-1 text-sm font-medium text-black hover:opacity-90"
                title={`Signed in as ${me.email}`}
              >
                Account
              </Link>
            </>
          ) : (
            <button
              onClick={() => openJoin("member")}
              className="rounded bg-amber-400 px-3 py-1 text-sm font-medium text-black hover:opacity-90"
            >
              Sign in / Join
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}