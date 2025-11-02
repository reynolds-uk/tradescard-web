"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";

type Tier = "access" | "member" | "pro";

type ApiAccount = {
  user_id: string;
  email: string;
  full_name?: string | null;
  members: null | {
    status: string;                      // active | trialing | past_due | canceled | free
    tier: Tier | string;
    current_period_end: string | null;
  };
};

type Offer = {
  id: string;
  name: string;
  blurb?: string | null;
  partner?: string | null;
  thumb_url?: string | null;
  href?: string | null;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://tradescard-api.vercel.app";

/** Normalise DB/API variants into the UI shape */
function normaliseOffer(raw: unknown): Offer | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const id = String(r["id"] ?? "");
  if (!id) return null;

  const getS = (v: unknown) => (typeof v === "string" ? v : undefined);

  return {
    id,
    name: getS(r["name"]) ?? getS(r["title"]) ?? "Untitled",
    blurb: getS(r["blurb"]) ?? getS(r["description"]) ?? null,
    partner: getS(r["partner"]) ?? null,
    thumb_url: getS(r["thumb_url"]) ?? null,
    href: getS(r["href"]) ?? getS(r["link"]) ?? null,
  };
}

export default function OffersPage() {
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
  const [offers, setOffers] = useState<Offer[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  async function currentUser() {
    const { data } = await supabase.auth.getSession();
    return data?.session?.user ?? null;
  }

  const isPaidActive = (a: ApiAccount | null) => {
    const t = (a?.members?.tier as Tier | undefined) ?? "access";
    const s = a?.members?.status ?? (t === "access" ? "free" : "inactive");
    return t !== "access" && s === "active";
    // (Trial handling: if you want trial to see member catalogue, allow s === "trialing")
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
        setOffers([]);
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

      // 2) Offers for paid members
      if (isPaidActive(acc)) {
        const res = await fetch(
          `${API_BASE}/api/offers?user_id=${encodeURIComponent(user.id)}`,
          { cache: "no-store", signal: abortRef.current.signal }
        );
        if (!res.ok) throw new Error(`offers ${res.status}`);
        const raw = await res.json();
        const list = (Array.isArray(raw) ? raw : raw?.items ?? []) as unknown[];
        setOffers(list.map(normaliseOffer).filter(Boolean) as Offer[]);
      } else {
        setOffers([]);
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
        <h1 className="text-2xl font-semibold">Offers</h1>
        <p className="text-neutral-400">
          Curated savings for the trade. Full catalogue for Members/Pro.
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
          Coming soon. Join free to get early access.
        </div>
      )}

      {!loading && account && !paid && (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
          <div className="font-medium mb-1">Member catalogue</div>
          <p className="text-neutral-300">
            You’re on the free tier. Upgrade to <span className="font-medium">Member</span> or{" "}
            <span className="font-medium">Pro</span> to unlock all offers.
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
          {offers.length === 0 && (
            <div className="col-span-full text-neutral-400">
              No offers available right now. Check back soon.
            </div>
          )}
          {offers.map((o) => (
            <a
              key={o.id}
              href={o.href || "#"}
              className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 hover:bg-neutral-800"
              target={o.href?.startsWith("http") ? "_blank" : undefined}
              rel={o.href?.startsWith("http") ? "noopener noreferrer" : undefined}
            >
              <div className="text-sm text-neutral-400">{o.partner || "Partner"}</div>
              <div className="font-medium">{o.name}</div>
              {o.blurb && <div className="text-sm text-neutral-400 mt-1">{o.blurb}</div>}
            </a>
          ))}
        </div>
      )}
    </main>
  );
}