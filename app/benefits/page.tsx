"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";

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

type Benefit = {
  id: string;
  name: string;
  summary?: string | null;
  provider?: string | null;
  href?: string | null;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://tradescard-api.vercel.app";

function normaliseBenefit(raw: unknown): Benefit | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const id = String(r["id"] ?? "");
  if (!id) return null;

  const s = (v: unknown) => (typeof v === "string" ? v : undefined);

  return {
    id,
    name: s(r["name"]) ?? s(r["title"]) ?? "Benefit",
    summary: s(r["summary"]) ?? s(r["description"]) ?? null,
    provider: s(r["provider"]) ?? null,
    href: s(r["href"]) ?? s(r["link"]) ?? null,
  };
}

export default function BenefitsPage() {
  const supabase = useMemo(
    () =>
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [account, setAccount] = useState<ApiAccount | null>(null);
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  async function currentUser() {
    const { data } = await supabase.auth.getSession();
    return data?.session?.user ?? null;
  }

  const isPaidActive = (a: ApiAccount | null) => {
    const t = (a?.members?.tier as Tier | undefined) ?? "access";
    const s = a?.members?.status ?? (t === "access" ? "free" : "inactive");
    return t !== "access" && s === "active";
  };

  async function load() {
    setError("");
    setLoading(true);

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      const user = await currentUser();
      if (!user) {
        setAccount(null);
        setBenefits([]);
        return;
      }

      // 1) Account
      const accRes = await fetch(
        `${API_BASE}/api/account?user_id=${encodeURIComponent(user.id)}`,
        { cache: "no-store", signal: abortRef.current.signal }
      );
      if (!accRes.ok) throw new Error(`account ${accRes.status}`);
      const acc: ApiAccount = await accRes.json();
      setAccount(acc);

      // 2) Benefits for paid members
      if (isPaidActive(acc)) {
        const res = await fetch(
          `${API_BASE}/api/benefits?user_id=${encodeURIComponent(user.id)}`,
          { cache: "no-store", signal: abortRef.current.signal }
        );
        if (!res.ok) throw new Error(`benefits ${res.status}`);
        const raw = await res.json();
        const list = (Array.isArray(raw) ? raw : raw?.items ?? []) as unknown[];
        setBenefits(list.map(normaliseBenefit).filter(Boolean) as Benefit[]);
      } else {
        setBenefits([]);
      }
    } catch (e: unknown) {
      const isAbort =
        (typeof DOMException !== "undefined" && e instanceof DOMException && e.name === "AbortError") ||
        ((e as { name?: string } | null)?.name === "AbortError");
      if (!isAbort) {
        const msg = e instanceof Error ? e.message : "Something went wrong";
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const paid = isPaidActive(account);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold">Benefits</h1>
        <p className="text-neutral-400">
          Built-in protection and support. Paid members unlock the full set.
        </p>
      </header>

      {error && (
        <div className="mb-4 rounded border border-red-600/40 bg-red-900/10 px-3 py-2 text-red-300">
          {error}
        </div>
      )}

      {loading && (
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 rounded-xl border border-neutral-800 bg-neutral-900 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && !account && (
        <div className="text-neutral-400">
          Details launching soon. Join free to get early access.
        </div>
      )}

      {!loading && account && !paid && (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
          <div className="font-medium mb-1">Included protection for paid members</div>
          <p className="text-neutral-300">
            You’re on the free tier. Upgrade to <span className="font-medium">Member</span> or{" "}
            <span className="font-medium">Pro</span> to unlock benefits like breakdown cover and wellbeing support.
          </p>
          <div className="mt-3 flex gap-2">
            <a className="px-4 py-2 rounded bg-amber-400 text-black font-medium" href="/account#upgrade">
              Upgrade now
            </a>
            <a className="px-4 py-2 rounded bg-neutral-800 hover:bg-neutral-700" href="/join">
              See plans
            </a>
          </div>
        </div>
      )}

      {!loading && paid && (
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