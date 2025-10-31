"use client";
import { useEffect, useState } from "react";

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
  process.env.NEXT_PUBLIC_API_URL || "https://tradescard-api.vercel.app";

export default function Home() {
  const [tab, setTab] = useState<"offers" | "benefits" | "rewards">("offers");
  const [offers, setOffers] = useState<Offer[]>([]);
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [summary, setSummary] = useState<RewardSummary | null>(null);
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadOffers() {
    try {
      setLoading(true);
      const r = await fetch(`${API_BASE}/api/offers?limit=12`);
      const d = await r.json();
      if (!Array.isArray(d)) throw new Error("Unexpected offers format");
      setOffers(d);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadBenefits() {
    try {
      setLoading(true);
      const r = await fetch(`${API_BASE}/api/benefits`);
      const d = await r.json();
      if (!Array.isArray(d)) throw new Error("Unexpected benefits format");
      setBenefits(d);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadSummary() {
    if (!userId) return;
    try {
      setLoading(true);
      const r = await fetch(
        `${API_BASE}/api/rewards/summary?user_id=${encodeURIComponent(userId)}`
      );
      const d = await r.json();
      setSummary(d);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // auto-load data when tab changes
  useEffect(() => {
    setError(null);
    if (tab === "offers") loadOffers();
    if (tab === "benefits") loadBenefits();
  }, [tab]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <header className="flex items-center justify-between pb-4 border-b border-neutral-800">
        <h1 className="text-xl font-semibold">TradesCard</h1>
        <nav className="flex gap-2 text-sm">
          {(["offers", "benefits", "rewards"] as const).map((k) => (
            <button
              key={k}
              className={`px-3 py-1 rounded ${
                tab === k
                  ? "bg-neutral-200 text-neutral-900"
                  : "bg-neutral-800 text-neutral-100 hover:bg-neutral-700"
              }`}
              onClick={() => setTab(k)}
            >
              {k[0].toUpperCase() + k.slice(1)}
            </button>
          ))}
        </nav>
      </header>

      {loading && <p className="mt-6 text-neutral-400">Loading…</p>}
      {error && (
        <p className="mt-6 text-red-400">
          ⚠️ Something went wrong: {error}
        </p>
      )}

      {tab === "offers" && !loading && !error && (
        <div className="mt-6 grid gap-3">
          {offers.map((o) => (
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
          {offers.length === 0 && (
            <p className="text-neutral-400">No offers yet.</p>
          )}
        </div>
      )}

      {tab === "benefits" && !loading && !error && (
        <div className="mt-6 grid gap-3">
          {benefits.map((b) => (
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
          {benefits.length === 0 && (
            <p className="text-neutral-400">No benefits yet.</p>
          )}
        </div>
      )}

      {tab === "rewards" && !loading && (
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
            >
              Check
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