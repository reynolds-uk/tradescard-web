"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient, type User } from "@supabase/supabase-js";
import { API_BASE } from "./apiBase"; // <-- now imported from your new helper

type Tier = "access" | "member" | "pro";

type ApiAccount = {
  user_id: string;
  email: string;
  full_name?: string | null;
  members: null | {
    status: string | null;                // "active" | "trialing" | "incomplete" | "canceled" | null
    tier: Tier | string | null;           // "member" | "pro" | null
    current_period_end: string | null;
  };
};

export type Me = {
  user?: User | null;
  tier: Tier;
  status: "free" | "trial" | "paid" | "inactive";
  email?: string;
  name?: string | null;
  ready: boolean; // prevents flicker in Nav/flags
};

function derive(
  me: Pick<Me, "tier" | "status">,
  a?: ApiAccount | null
): Pick<Me, "tier" | "status"> {
  const apiTier = (a?.members?.tier as Tier | undefined) ?? "access";
  const apiStatus =
    a?.members?.status ?? (apiTier === "access" ? "free" : "inactive");

  // normalise to UI statuses
  const status: Me["status"] =
    apiStatus === "active"
      ? "paid"
      : apiStatus === "trialing"
      ? "trial"
      : apiTier === "access"
      ? "free"
      : "inactive";

  const tier: Tier =
    apiTier === "member" || apiTier === "pro" ? apiTier : "access";

  return { tier, status };
}

async function fetchAccount(userId: string): Promise<ApiAccount | null> {
  try {
    const r = await fetch(
      `${API_BASE}/api/account?user_id=${encodeURIComponent(userId)}`,
      { cache: "no-store" }
    );
    if (!r.ok) return null;
    return (await r.json()) as ApiAccount;
  } catch {
    return null;
  }
}

export function useMe(): Me {
  const supabase = useMemo(
    () =>
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const [me, setMe] = useState<Me>({
    tier: "access",
    status: "free",
    ready: false,
  });

  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;

    const run = async () => {
      const { data } = await supabase.auth.getSession();
      const user = data?.session?.user ?? null;

      // not signed in → simple access/free
      if (!user) {
        if (alive.current)
          setMe({ user: null, tier: "access", status: "free", ready: true });
        return;
      }

      // optimistic state while fetching
      if (alive.current) {
        setMe((prev) => ({
          ...prev,
          user,
          email: user.email ?? prev.email,
          tier: prev.tier ?? "access",
          status: prev.status ?? "free",
          ready: prev.ready || false,
        }));
      }

      const account = await fetchAccount(user.id);
      const { tier, status } = derive({ tier: "access", status: "free" }, account);

      if (alive.current) {
        setMe({
          user,
          email: account?.email ?? user.email ?? undefined,
          name: account?.full_name ?? null,
          tier,
          status,
          ready: true,
        });
      }

      // If just returned from Stripe, poll a few times for update
      const hasSessionId =
        typeof window !== "undefined" &&
        new URLSearchParams(window.location.search).get("session_id");

      if (hasSessionId && (tier === "access" || status !== "paid")) {
        let attempts = 0;
        while (alive.current && attempts < 10) {
          await new Promise((r) => setTimeout(r, 2000));
          attempts++;

          const refreshed = await fetchAccount(user.id);
          const next = derive({ tier, status }, refreshed);

          if (alive.current) {
            setMe((prev) => ({
              ...prev,
              tier: next.tier,
              status: next.status,
              email: refreshed?.email ?? prev.email,
              name: refreshed?.full_name ?? prev.name ?? null,
              ready: true,
            }));
          }

          if (
            next.status === "paid" ||
            next.tier === "member" ||
            next.tier === "pro"
          )
            break;
        }
      }
    };

    run();

    const sub = supabase.auth.onAuthStateChange(() => {
      run();
    });

    return () => {
      alive.current = false;
      sub.data.subscription.unsubscribe();
    };
  }, [supabase]);

  return me;
}