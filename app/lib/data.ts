// app/lib/data.ts
"use client";

import useSWR from "swr";
import { createClient } from "@supabase/supabase-js";

const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const fetcher = async <T,>(key: string, q: () => Promise<T>) => q();

export function useSessionUser() {
  return useSWR(["session-user"], async () => {
    const { data } = await supa.auth.getUser();
    return data.user ?? null;
  }, { revalidateOnFocus: false, dedupingInterval: 60_000 });
}

export function useProfile(userId?: string | null) {
  return useSWR(
    userId ? ["profile", userId] : null,
    async () => {
      const { data, error } = await supa
        .from("profiles")
        .select("user_id,email,name")
        .eq("user_id", userId!)
        .single();                            // <- avoid array shape
      if (error) throw error;
      return data;
    },
    { revalidateOnFocus: false, dedupingInterval: 60_000 }
  );
}

export function useMember(userId?: string | null) {
  return useSWR(
    userId ? ["member", userId] : null,
    async () => {
      const { data, error } = await supa
        .from("members")
        .select("status,tier,current_period_end,stripe_customer_id,stripe_subscription_id,updated_at")
        .eq("user_id", userId!)
        .single();
      if (error) throw error;
      return data;
    },
    { revalidateOnFocus: false, dedupingInterval: 60_000 }
  );
}