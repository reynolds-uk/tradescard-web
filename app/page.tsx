// app/page.tsx
"use client";

import { useEffect, useState } from "react";
import HeaderAuth from "./header-client";

type Offer = {
  id: string;
  title: string;
  partner?: string | null;
  category?: string | null;
  link?: string | null;
  code?: string | null;
};

type Benefit = {
  id: string;
  title: string;
  tier?: string | null;
  description?: string | null;
};

type RewardSummary = {
  total_points?: number;
  month?: number;
  lifetime?: number;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://tradescard-api.vercel.app";

type TabKey = "offers" | "benefits" | "rewards";

function TabButton({
  k,
  active,
  onClick,
}: {
  k: TabKey;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      aria-current={active ? "page" : undefined}
      className={`px-3 py-1 rounded text-sm transition
        ${active ? "bg-neutral-200 text-neutral-900" : "bg-neutral-800 text-neutral-100 hover:bg-neutral-700"}`}
      onClick={onClick}
    >
      {k[0].toUpperCase() + k.slice(1)}
    </button>
  );
}

function SkeletonCard() {
  return (
    <div className="border border-neutral-800 rounded p-3 animate-pulse">
      <div className="h-4 w-40 bg-neutral-800 rounded mb-2" />
      <div className="h-3 w-24 bg-neutral-900 rounded" />
    </div>
  );
}

export default function Home() {
  const [tab, setTab] = useState<TabKey>("offers");
  const [offers, setOffers] = useState<Offer[]>([]);
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [summary, setSummary] = useState<RewardSummary | null>(null);
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadOffers() {
    try {
      setLoading(true);
      setError(null);
      const r = await fetch(`${API_BASE}/api/offers?limit=12`, { cache: "no-store" });
      if (!r.ok) throw new Error(`offers ${r.status}`);
      const d = await r.json();
      if (!Array.isArray(d)) throw new Error("Unexpected offers format");
      setOffers(d);
    } catch (e: any) {
      console.error("Load offers failed:", e);
      setError(e.message || "Failed to load offers");
    } finally {
      setLoading(false);
    }
  }

  async function loadBenefits() {
    try {
      setLoading(true);
      setError(null);
      const r = await fetch(`${API_BASE}/api/benefits`, { cache: "no-store" });
      if (!r.ok) throw new Error(`benefits ${r.status}`);
      const d = await r.json();
      if (!Array.isArray(d)) throw new Error("Unexpected benefits format");
      setBenefits(d);
    } catch (e: any) {
      console.error("Load benefits failed:", e);
      setError(e.message || "Failed to load benefits");
    } finally {
      setLoading(false);
    }
  }

  async function loadSummary() {
    if (!userId) return;
    try {
      setLoading(true);
      setError(null);
      const r = await fetch(
        `${API_BASE}/api/rewards/summary?user_id=${encodeURIComponent(userId)}`,
        { cache: "no-store" }
      );
      if (!r.ok) throw new Error(`rewards ${r.status}`);
      const d = await r.json();
      setSummary(d);
    } catch (e: any) {
      console.error("Load rewards summary failed:", e);
      setError(e.message || "Failed to load rewards");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (tab === "offers") loadOffers();
    if (tab === "benefits") loadBenefits();
    // rewards loads on click so you can try different UUIDs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      {/* Top bar */}
      <header className="flex items-center justify-between pb-4 border-b border-neutral-800">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded bg-neutral-800" aria-hidden />
          <h1 className="text-xl font-semibold">TradesCard</h1>
        </div>
        <div className="flex items-center gap-4">
          <HeaderAuth />
        </div>
      </header>

      {/* Tabs */}
      <nav className="flex gap-2 pt-4">
        {(["offers", "benefits", "rewards"] as const).map((k) => (
          <TabButton key={k} k={k} active={tab === k} onClick={() => setTab(k)} />
        ))}
      </nav>

      {/* Alerts */}
      {error && (
        <p className="mt-6 text-red-400">⚠️ Something went wrong: {error}</p>
      )}

      {/* Offers */}
      {tab === "offers" && (
        <div className="mt-6 grid gap-3">
          {loading &&
            Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
          {!loading &&
            offers.map((o) => (
              <div
                key={o.id}
                className="border border-neutral-800 rounded p-3 flex items-center justify-between hover:border-neutral-600 transition"
              >
                <div>
                  <div className="font-medium">{o.title}</div>
                  <div className="text-xs text-neutral-400">
                    {o.partner || "—"} · {o.category || "General"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {o.code && (
                    <span className="text-xs bg-neutral-800 rounded px-2 py-1">
                      Code: {o.code}
                    </span>
                  )}
                  {o.link && (
                    <a
                      className="text-xs underline text-neutral-300 hover:text-white"
                      href={o.link}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Get deal
                    </a>
                  )}
                </div>
              </div>
            ))}
          {!loading && offers.length === 0 && (
            <p className="text-neutral-400">No offers yet.</p>
          )}
        </div>
      )}

      {/* Benefits */}
      {tab === "benefits" && (
        <div className="mt-6 grid gap-3">
          {loading &&
            Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
          {!loading &&
            benefits.map((b) => (
              <div
                key={b.id}
                className="border border-neutral-800 rounded p-3 hover:border-neutral-600 transition"
              >
                <div className="text-xs text-neutral-500 uppercase tracking-wide">
                  {b.tier || "General"}
                </div>
                <div className="font-medium">{b.title}</div>
                {b.description && (
                  <div className="text-sm text-neutral-300 mt-1">
                    {b.description}
                  </div>
                )}
              </div>
            ))}
          {!loading && benefits.length === 0 && (
            <p className="text-neutral-400">No benefits yet.</p>
          )}
        </div>
      )}

      {/* Rewards */}
      {tab === "rewards" && (
        <div className="mt-6">
          <label className="text-sm text-neutral-400">Test user UUID</label>
          <div className="flex gap-2 mt-2">
            <input
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="bg-neutral-900 border border-neutral-800 rounded px-3 py-2 w-full text-sm"
              placeholder="00000000-0000-0000-0000-000000000000"
            />
            <button
              onClick={loadSummary}
              className="px-4 py-2 rounded bg-neutral-200 text-neutral-900 hover:bg-neutral-300"
              disabled={loading || !userId}
            >
              {loading ? "Checking…" : "Check"}
            </button>
          </div>
          {summary && (
            <div className="mt-4 border border-neutral-800 rounded p-3">
              <div className="font-medium">Points</div>
              <div className="text-sm mt-1">
                This month: {summary.month ?? summary.total_points ?? 0}
              </div>
              <div className="text-sm">
                Lifetime: {summary.lifetime ?? summary.total_points ?? 0}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}