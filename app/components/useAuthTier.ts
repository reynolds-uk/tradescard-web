// app/components/useAuthTier.ts
"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://tradescard-api.vercel.app";

type Tier = "access" | "member" | "pro";

export function useAuthTier() {
  const supabase = useMemo(
    () =>
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [tier, setTier] = useState<Tier>("access");
  const [status, setStatus] = useState<string>("free");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data } = await supabase.auth.getSession();
        const user = data?.session?.user ?? null;
        if (!user) {
          if (!cancelled) {
            setUserId(null);
            setEmail(null);
            setTier("access");
            setStatus("free");
          }
          return;
        }
        if (!cancelled) {
          setUserId(user.id);
          setEmail(user.email ?? null);
        }

        const r = await fetch(`${API_BASE}/api/account?user_id=${encodeURIComponent(user.id)}`, { cache: "no-store" });
        if (r.ok) {
          const a = await r.json();
          const t = (a?.members?.tier as Tier) ?? "access";
          const s = a?.members?.status ?? "free";
          if (!cancelled) {
            setTier(["access", "member", "pro"].includes(t) ? t : "access");
            setStatus(s);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [supabase]);

  return { loading, userId, email, tier, status, supabase };
}