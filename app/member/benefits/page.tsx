// app/member/benefits/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/src/lib/supabaseClient";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://tradescard-api.vercel.app";

type Benefit = {
  id: string;
  name: string;
  summary?: string | null;
  provider?: string | null;
  href?: string | null; // docs / claim flow
};

export default function MemberBenefitsPage() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabase(), []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [benefits, setBenefits] = useState<Benefit[]>([]);

  useEffect(() => {
    let aborted = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        if (!supabase) {
          setError("Auth not initialised");
          return;
        }
        const { data } = await supabase.auth.getSession();
        const user = data?.session?.user ?? null;
        if (!user) {
          router.push("/join");
          return;
        }

        // 1) Membership gate
        const acc = await fetch(
          `${API_BASE}/api/account?user_id=${encodeURIComponent(user.id)}`,
          { cache: "no-store" }
        );
        if (!acc.ok) throw new Error(`account ${acc.status}`);
        const a = await acc.json();
        const tier = (a?.members?.tier as string) ?? "access";
        const status = a?.members?.status ?? "free";
        const eligible = tier !== "access" && status === "active";
        if (!eligible) {
          router.push("/join");
          return;
        }

        // 2) Load benefits (soft-fail if API not ready)
        const res = await fetch(
          `${API_BASE}/api/benefits?user_id=${encodeURIComponent(user.id)}`,
          { cache: "no-store" }
        );

        if (res.ok) {
          const json = await res.json();
          if (!aborted) setBenefits(Array.isArray(json) ? json : json?.items ?? []);
        } else {
          if (!aborted) setError("Could not load benefits yet. Please try again shortly.");
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Something went wrong";
        if (!aborted) setError(msg);
      } finally {
        if (!aborted) setLoading(false);
      }
    }

    load();
    return () => {
      aborted = true;
    };
  }, [supabase, router]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold">Member Benefits</h1>
        <p className="text-neutral-400">Included protection and support for paid members.</p>
      </header>

      {loading && (
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 rounded-xl border border-neutral-800 bg-neutral-900 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="rounded border border-red-600/40 bg-red-900/10 p-3 text-red-300">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="grid gap-4 md:grid-cols-3">
          {benefits.length === 0 && (
            <div className="col-span-full text-neutral-400">
              No benefits available right now. Check back soon.
            </div>
          )}

          {benefits.map((b) => (
            <a
              key={b.id}
              href={b.href || "#"}
              className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 hover:bg-neutral-800"
              target={b.href?.startsWith("http") ? "_blank" : undefined}
              rel={b.href?.startsWith("http") ? "noopener noreferrer" : undefined}
            >
              <div className="text-sm text-neutral-400">{b.provider || "Included"}</div>
              <div className="font-medium">{b.name}</div>
              {b.summary && <div className="text-sm text-neutral-400 mt-1">{b.summary}</div>}
            </a>
          ))}
        </div>
      )}
    </main>
  );
}