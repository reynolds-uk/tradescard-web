"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient, type User } from "@supabase/supabase-js";

type Tier = "access" | "member" | "pro";
type ApiAccount = {
  user_id: string;
  email: string;
  full_name?: string | null;
  members: null | {
    status: string;
    tier: Tier | string;
    current_period_end: string | null;
  };
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://tradescard-api.vercel.app";

export type Me = {
  user?: User | null;
  tier: Tier;
  status: string;
  email?: string;
  name?: string | null;
  ready: boolean;        // prevents flicker in Nav/flags
};

export function useMe(): Me {
  const supabase = useMemo(
    () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!),
    []
  );
  const [me, setMe] = useState<Me>({ tier: "access", status: "free", ready: false });

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const user = data?.session?.user ?? null;

      if (!user) {
        if (mounted) setMe({ user: null, tier: "access", status: "free", ready: true });
        return;
      }

      const r = await fetch(`${API_BASE}/api/account?user_id=${encodeURIComponent(user.id)}`, { cache: "no-store" });
      if (!r.ok) {
        if (mounted) setMe({ user, tier: "access", status: "free", email: user.email ?? undefined, ready: true });
        return;
      }
      const a: ApiAccount = await r.json();
      const tier = ((a.members?.tier as Tier) ?? "access") as Tier;
      const status = a.members?.status ?? (tier === "access" ? "free" : "inactive");
      if (mounted) {
        setMe({
          user,
          tier,
          status,
          email: a.email,
          name: a.full_name ?? null,
          ready: true,
        });
      }
    })();

    const sub = supabase.auth.onAuthStateChange(() => {
      // Re-run on auth changes
      (async () => {
        const { data } = await supabase.auth.getSession();
        const user = data?.session?.user ?? null;
        if (!user) {
          setMe({ user: null, tier: "access", status: "free", ready: true });
        } else {
          const r = await fetch(`${API_BASE}/api/account?user_id=${encodeURIComponent(user.id)}`, { cache: "no-store" });
          if (r.ok) {
            const a: ApiAccount = await r.json();
            const tier = ((a.members?.tier as Tier) ?? "access") as Tier;
            const status = a.members?.status ?? (tier === "access" ? "free" : "inactive");
            setMe({ user, tier, status, email: a.email, name: a.full_name ?? null, ready: true });
          } else {
            setMe({ user, tier: "access", status: "free", email: user.email ?? undefined, ready: true });
          }
        }
      })();
    });

    return () => {
      sub.data.subscription.unsubscribe();
      mounted = false;
    };
  }, [supabase]);

  return me;
}