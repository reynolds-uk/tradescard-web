// app/page.tsx
"use client";

import { useEffect, useRef, useState } from "react";

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

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://tradescard-api.vercel.app";

type TabKey = "offers" | "benefits";

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
  const [offersLoading, setOffersLoading] = useState(false);
  const [offersError, setOffersError] = useState<string | null>(null);

  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [benefitsLoading, setBenefitsLoading] = useState(false);
  const [benefitsError, setBenefitsError] = useState<string | null>(null);

  // keep a ref to the current controller so we can cancel on tab switch/unmount
  const controllerRef = useRef<AbortController | null>(null);

  async function loadOffers(force = false) {
    if (offers.length && !force) return;
    controllerRef.current?.abort();
    const ctrl = new AbortController();
    controllerRef.current = ctrl;

    try {
      setOffersLoading(true);
      setOffersError(null);
      const r = await fetch(`${API_BASE}/api/offers?limit=12`, {
        cache: "no-store",
        signal: ctrl.signal,
      });
      if (!r.ok) throw new Error(`offers ${r.status}`);
      const d = await r.json();
      if (!Array.isArray(d)) throw new Error("Unexpected offers format");
      setOffers(d);
    } catch (e: any) {
      if (e.name !== "AbortError") {
        console.error("Load offers failed:", e);
        setOffersError(e.message || "Failed to load offers");
      }
    } finally {
      setOffersLoading(false);
    }
  }

  async function loadBenefits(force = false) {
    if (benefits.length && !force) return;
    controllerRef.current?.abort();
    const ctrl = new AbortController();
    controllerRef.current = ctrl;

    try {
      setBenefitsLoading(true);
      setBenefitsError(null);
      const r = await fetch(`${API_BASE}/api/benefits`, {
        cache: "no-store",
        signal: ctrl.signal,
      });
      if (!r.ok) throw new Error(`benefits ${r.status}`);
      const d = await r.json();
      if (!Array.isArray(d)) throw new Error("Unexpected benefits format");
      setBenefits(d);
    } catch (e: any) {
      if (e.name !== "AbortError") {
        console.error("Load benefits failed:", e);
        setBenefitsError(e.message || "Failed to load benefits");
      }
    } finally {
      setBenefitsLoading(false);
    }
  }

  // initial prime
  useEffect(() => {
    loadOffers();
    return () => controllerRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // lazy load per tab
  useEffect(() => {
    if (tab === "offers") loadOffers();
    if (tab === "benefits") loadBenefits();
    return () => controllerRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      {/* Hero / strapline */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Offers & Benefits</h1>
        <p className="text-sm text-neutral-400">
          Save money with member-friendly deals. Paid members also earn{" "}
          <a className="underline" href="/rewards">rewards</a> every billing month.
        </p>
      </div>

      {/* Rewards teaser */}
      <div className="mb-6 rounded-lg border border-neutral-800 bg-neutral-900/60 p-4 flex items-center justify-between">
        <div>
          <div className="font-medium">Points win prizes</div>
          <div className="text-sm text-neutral-400">
            Earn points each month you’re a paid member. Higher tiers boost your entries.
          </div>
        </div>
        <a
          href="/rewards"
          className="px-3 py-1 rounded bg-neutral-200 text-neutral-900 text-sm hover:bg-white"
        >
          View rewards
        </a>
      </div>

      {/* Tabs */}
      <nav className="flex gap-2">
        {(["offers", "benefits"] as const).map((k) => (
          <TabButton key={k} k={k} active={tab === k} onClick={() => setTab(k)} />
        ))}
      </nav>

      {/* OFFERS */}
      {tab === "offers" && (
        <section className="mt-6 grid gap-3">
          {offersLoading &&
            Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={`o-skel-${i}`} />)}

          {!offersLoading && offersError && (
            <div className="rounded border border-red-600/40 bg-red-900/10 px-3 py-2 text-red-300">
              ⚠️ {offersError}{" "}
              <button
                onClick={() => loadOffers(true)}
                className="underline ml-2 text-red-200"
              >
                Retry
              </button>
            </div>
          )}

          {!offersLoading &&
            !offersError &&
            offers.map((o) => (
              <article
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
              </article>
            ))}

          {!offersLoading && !offersError && offers.length === 0 && (
            <p className="text-neutral-400">No offers yet.</p>
          )}
        </section>
      )}

      {/* BENEFITS */}
      {tab === "benefits" && (
        <section className="mt-6 grid gap-3">
          {benefitsLoading &&
            Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={`b-skel-${i}`} />)}

          {!benefitsLoading && benefitsError && (
            <div className="rounded border border-red-600/40 bg-red-900/10 px-3 py-2 text-red-300">
              ⚠️ {benefitsError}{" "}
              <button
                onClick={() => loadBenefits(true)}
                className="underline ml-2 text-red-200"
              >
                Retry
              </button>
            </div>
          )}

          {!benefitsLoading &&
            !benefitsError &&
            benefits.map((b) => (
              <article
                key={b.id}
                className="border border-neutral-800 rounded p-3 hover:border-neutral-600 transition"
              >
                <div className="text-xs text-neutral-500 uppercase tracking-wide">
                  {b.tier || "General"}
                </div>
                <div className="font-medium">{b.title}</div>
                {b.description && (
                  <div className="text-sm text-neutral-300 mt-1">{b.description}</div>
                )}
              </article>
            ))}

          {!benefitsLoading && !benefitsError && benefits.length === 0 && (
            <p className="text-neutral-400">No benefits yet.</p>
          )}
        </section>
      )}
    </div>
  );
}