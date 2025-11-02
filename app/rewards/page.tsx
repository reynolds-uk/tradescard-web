// app/rewards/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";

type Me = {
  user_id: string;
  email: string;
  name?: string | null;
  tier: "access" | "member" | "pro";
  status: string; // active | trialing | past_due | canceled | free
  renewal_date: string | null;
};

type ApiAccount = {
  user_id: string;
  email: string;
  full_name?: string | null;
  members: null | {
    status: string;
    tier: "access" | "member" | "pro" | string;
    current_period_end: string | null;
  };
};

type RewardSummary = {
  lifetime_points: number;
  points_this_month: number;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://tradescard-api.vercel.app";

// Normalise any legacy shapes {month,lifetime,total_points} -> {points_this_month,lifetime_points}
function normaliseSummary(raw: any): RewardSummary {
  return {
    lifetime_points:
      Number(raw?.lifetime_points ?? raw?.lifetime ?? raw?.total_points ?? 0) || 0,
    points_this_month:
      Number(raw?.points_this_month ?? raw?.month ?? raw?.total_points ?? 0) || 0,
  };
}

export default function RewardsPage() {
  const supabase = useMemo(
    () =>
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const [me, setMe] = useState<Me | null>(null);
  const [summary, setSummary] = useState<RewardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>("");
  const abortRef = useRef<AbortController | null>(null);

  const mapToMe = (a: ApiAccount): Me => ({
    user_id: a.user_id,
    email: a.email,
    name: a.full_name ?? null,
    tier: (a.members?.tier as Me["tier"]) ?? "access",
    status: a.members?.status ?? "free",
    renewal_date: a.members?.current_period_end ?? null,
  });

  async function currentUser() {
    const { data } = await supabase.auth.getSession();
    return data?.session?.user ?? null;
  }

  async function load() {
    setError("");
    setLoading(true);

    // cancel any in-flight request on quick refresh
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      const user = await currentUser();
      if (!user) {
        setMe(null);
        setSummary(null);
        return;
      }

      // 1) Account snapshot (tier/status)
      const accRes = await fetch(
        `${API_BASE}/api/account?user_id=${encodeURIComponent(user.id)}`,
        { cache: "no-store", signal: abortRef.current.signal }
      );
      if (!accRes.ok) throw new Error(`account ${accRes.status}`);
      const accData: ApiAccount = await accRes.json();
      const mapped = mapToMe(accData);
      setMe(mapped);

      // 2) Points if paid & active
      const isPaid = mapped.tier !== "access" && mapped.status === "active";
      if (isPaid) {
        const r = await fetch(
          `${API_BASE}/api/rewards/summary?user_id=${encodeURIComponent(
            mapped.user_id
          )}`,
          { cache: "no-store", signal: abortRef.current.signal }
        );
        if (!r.ok) throw new Error(`rewards ${r.status}`);
        const raw = await r.json();
        setSummary(normaliseSummary(raw));
      } else {
        setSummary(null);
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        setError(e?.message || "Something went wrong");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startMembership = async (plan: "member" | "pro") => {
    try {
      setBusy(true);
      setError("");

      const user = await currentUser();
      if (!user) {
        alert("Please sign in first using the form at the top right.");
        return;
      }

      const res = await fetch(`${API_BASE}/api/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          email: user.email,
          plan,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.url) throw new Error(json?.error || "Checkout failed");
      window.location.href = json.url;
    } catch (e: any) {
      setError(e?.message || "Could not start checkout");
    } finally {
      setBusy(false);
    }
  };

  const refresh = () => load();

  const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
      <div className="text-sm text-neutral-400 flex items-center justify-between">
        <span>{title}</span>
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );

  const Stat = ({ value, label }: { value: string; label: string }) => (
    <div className="text-center">
      <div className="text-3xl font-semibold">{value}</div>
      <div className="text-xs text-neutral-400 mt-1">{label}</div>
    </div>
  );

  const tierMultiplier = (tier: Me["tier"]) =>
    tier === "member" ? 1.25 : tier === "pro" ? 1.5 : 1;

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 text-sm text-neutral-200">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Rewards</h1>
          <p className="text-neutral-400">
            Earn points every month you’re a member. Higher tiers boost your points. Points win prizes — we run weekly and monthly draws.
          </p>
        </div>
        <button
          onClick={refresh}
          className="rounded bg-neutral-800 hover:bg-neutral-700 px-3 py-2"
          disabled={loading}
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </header>

      {error && (
        <div className="mb-4 rounded border border-red-600/40 bg-red-900/10 px-3 py-2 text-red-300">
          {error}
        </div>
      )}

      {loading && (
        <div className="grid gap-3 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-xl border border-neutral-800 bg-neutral-900 p-5 animate-pulse h-28" />
          ))}
        </div>
      )}

      {!loading && !me && (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
          <div className="font-medium mb-1">Please sign in to see your rewards.</div>
          <p className="text-neutral-400">
            Use the email field in the header to send yourself a magic link.
          </p>
        </div>
      )}

      {!loading && me && (me.tier === "access" || me.status !== "active") && (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
          <div className="font-medium mb-2">Rewards are for paid members.</div>
          <p className="text-neutral-300">
            Upgrade to <span className="font-medium">Member</span> (1.25× points) or{" "}
            <span className="font-medium">Pro</span> (1.5× points) to start collecting entries for weekly spot prizes and the monthly draw.
          </p>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => startMembership("member")}
              disabled={busy}
              className="px-4 py-2 rounded bg-amber-400 text-black font-medium disabled:opacity-60"
            >
              {busy ? "Opening…" : "Upgrade now"}
            </button>
            <a href="/" className="px-4 py-2 rounded bg-neutral-800 hover:bg-neutral-700">
              See offers
            </a>
          </div>
        </div>
      )}

      {!loading && me && me.tier !== "access" && me.status === "active" && (
        <>
          <section className="grid gap-3 md:grid-cols-3">
            <Card title="Points this month (base)">
              <Stat
                value={String(summary?.points_this_month ?? 0)}
                label="Base points earned this billing month"
              />
            </Card>

            <Card title="Tier boost">
              <div className="flex items-center justify-between">
                <div className="text-2xl font-semibold">
                  {me.tier === "member" ? "1.25×" : me.tier === "pro" ? "1.50×" : "1.00×"}
                </div>
                <span className="rounded bg-neutral-800 px-2 py-0.5 text-xs">
                  {me.tier.toUpperCase()}
                </span>
              </div>
              <div className="text-xs text-neutral-400 mt-1">Upgrade for more entries</div>
            </Card>

            <Card title="Entries this month">
              <Stat
                value={String(
                  Math.round((summary?.points_this_month ?? 0) * tierMultiplier(me.tier))
                )}
                label="Used for monthly prize draw"
              />
            </Card>
          </section>

          <section className="mt-4">
            <Card title="Lifetime points">
              <div className="text-3xl font-semibold">
                {summary?.lifetime_points ?? 0}
              </div>
              <div className="text-xs text-neutral-400 mt-1">
                Lifetime points help with long-term milestones and special giveaways.
              </div>
            </Card>
          </section>

          <section className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900 p-5">
            <div className="font-medium mb-2">How it works</div>
            <ul className="list-disc list-inside text-neutral-300 space-y-1">
              <li>Earn points every billing month you’re an active paid member.</li>
              <li>Your tier boosts points: Access 1.0×, Member 1.25×, Pro 1.5×.</li>
              <li>Points = entries. We run weekly spot prizes and a monthly draw.</li>
            </ul>
          </section>
        </>
      )}
    </main>
  );
}