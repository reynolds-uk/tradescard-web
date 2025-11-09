// app/member/rewards/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import PrimaryButton from "@/components/PrimaryButton";
import { useMe } from "@/lib/useMe";
import { useMeReady } from "@/lib/useMeReady";
import Link from "next/link";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://tradescard-api.vercel.app";

type Tier = "access" | "member" | "pro";

type RewardsSummary = {
  lifetime_points: number;
  points_this_month: number;
};

export default function MemberRewardsPage() {
  const me = useMe();                  // { user?, tier?, status? }
  const ready = useMeReady();          // avoid auth flash

  const tier: Tier = (me?.tier as Tier) ?? "access";
  const isPaid =
    (tier === "member" || tier === "pro") &&
    (me?.status === "active" || me?.status === "trialing");

  const uid = me?.user?.id ?? null;

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<RewardsSummary | null>(null);
  const [error, setError] = useState<string>("");

  // Tier multipliers
  const boost = tier === "pro" ? 1.5 : tier === "member" ? 1.25 : 0;
  const boostLabel = tier === "pro" ? "1.5×" : tier === "member" ? "1.25×" : "—";

  // Derived entries (client-side estimate for display only)
  const monthPoints = summary?.points_this_month ?? 0;
  const lifetimePoints = summary?.lifetime_points ?? 0;
  const monthEntries = isPaid ? Math.floor(monthPoints * boost) : 0;
  const lifetimeEntries = isPaid ? lifetimePoints : 0; // lifetime draw = 1 entry per lifetime point

  // Fixture placeholders (wire to DB later)
  const now = new Date();
  const currentPrizeClose = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const lifetimePrizeClose = new Date(now.getFullYear(), 11, 31);

  // Fetch rewards once we *know* there is a user (and avoid doing it while auth is booting)
  useEffect(() => {
    if (!ready) return;

    // If not signed in or not paid, we still render the page with a gentle message
    if (!uid) {
      setSummary(null);
      setLoading(false);
      return;
    }

    let aborted = false;
    (async () => {
      try {
        setLoading(true);
        setError("");

        const url = `${API_BASE}/api/rewards/summary?user_id=${encodeURIComponent(uid)}`;
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`rewards/summary ${res.status}`);

        const data: RewardsSummary = await res.json();
        if (!aborted) {
          setSummary({
            lifetime_points: Number.isFinite(data.lifetime_points)
              ? data.lifetime_points
              : 0,
            points_this_month: Number.isFinite(data.points_this_month)
              ? data.points_this_month
              : 0,
          });
        }
      } catch (e) {
        if (!aborted) setError(e instanceof Error ? e.message : "Failed to load rewards");
      } finally {
        if (!aborted) setLoading(false);
      }
    })();

    return () => {
      aborted = true;
    };
  }, [ready, uid]);

  const subtitle = useMemo(() => {
    if (!ready) return "Loading…";
    if (!uid) return "Sign in to see your rewards.";
    if (!isPaid) return "Activate a membership to start earning points and entries.";
    return "Your points and entries update automatically as you use TradeCard.";
  }, [ready, uid, isPaid]);

  return (
    <Container>
      <PageHeader title="Rewards" subtitle={subtitle} />

      {/* Errors */}
      {error && (
        <div className="mb-4 rounded border border-red-600/40 bg-red-900/10 px-3 py-2 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Skeleton */}
      {(!ready || loading) && (
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-2xl border border-neutral-800 bg-neutral-900/60 animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Content */}
      {ready && !loading && (
        <>
          {!uid || !isPaid ? (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 text-sm text-neutral-300">
              This area shows your member rewards once you’re signed in with an active membership.
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href="/offers"
                  className="rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm hover:bg-neutral-800"
                >
                  View offers
                </Link>
                <Link
                  href="/join"
                  className="rounded-xl bg-white px-3 py-2 text-sm text-black hover:bg-neutral-200"
                >
                  Join to start earning
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* Stat tiles */}
              <div className="grid gap-3 sm:grid-cols-3">
                <Stat title="Points this month (base)" value={fmt(monthPoints)} />
                <Stat title="Tier boost" value={boostLabel} />
                <Stat title="Lifetime points" value={fmt(lifetimePoints)} />
              </div>

              {/* Entries breakdown */}
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <EntriesCard
                  tone="primary"
                  title="Current Prize entries"
                  lines={[
                    ["Base points this month", fmt(monthPoints)],
                    ["Tier boost", boostLabel],
                    ["Estimated entries", fmt(monthEntries)],
                  ]}
                  closes={currentPrizeClose}
                />
                <EntriesCard
                  tone="amber"
                  title="Lifetime Prize entries"
                  lines={[
                    ["Lifetime points", fmt(lifetimePoints)],
                    ["Estimated entries", fmt(lifetimeEntries)],
                  ]}
                  closes={lifetimePrizeClose}
                />
              </div>

              {/* Ways to earn more */}
              <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
                <div className="mb-1 text-sm font-semibold">Ways to earn more</div>
                <ul className="mt-1 grid gap-2 text-sm text-neutral-300 md:grid-cols-2">
                  <li className="rounded-xl border border-neutral-800 bg-neutral-950 p-3">
                    <div className="font-medium">Redeem offers</div>
                    <p className="text-neutral-400">
                      Earn activity points when you redeem partner deals.
                    </p>
                    <div className="mt-2">
                      <Link
                        href="/offers"
                        className="inline-block rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-xs hover:bg-neutral-800"
                      >
                        Browse offers
                      </Link>
                    </div>
                  </li>
                  <li className="rounded-xl border border-neutral-800 bg-neutral-950 p-3">
                    <div className="font-medium">Refer a mate</div>
                    <p className="text-neutral-400">
                      Get a points boost when your referral activates their membership.
                    </p>
                    <div className="mt-2">
                      <Link
                        href="/account/referrals"
                        className="inline-block rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-xs hover:bg-neutral-800"
                      >
                        Get referral link
                      </Link>
                    </div>
                  </li>
                  <li className="rounded-xl border border-neutral-800 bg-neutral-950 p-3">
                    <div className="font-medium">Stay on Pro</div>
                    <p className="text-neutral-400">
                      Keep the 1.5× boost. Long-tenure multipliers apply at 12+ months.
                    </p>
                    <div className="mt-2">
                      <Link
                        href="/account"
                        className="inline-block rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-xs hover:bg-neutral-800"
                      >
                        Manage plan
                      </Link>
                    </div>
                  </li>
                  <li className="rounded-xl border border-neutral-800 bg-neutral-950 p-3">
                    <div className="font-medium">Stay active</div>
                    <p className="text-neutral-400">
                      Periodic boosts for consecutive active months. Watch this space.
                    </p>
                  </li>
                </ul>
              </div>

              {/* Small legal/clarity strip */}
              <div className="mx-auto mt-6 grid max-w-3xl gap-2 text-center text-xs text-neutral-400 sm:grid-cols-3">
                <div>Entries are estimates; final entries are confirmed at draw close.</div>
                <div>Cancel any time in <span className="text-neutral-300">Manage billing</span>.</div>
                <div>Postal entry available for each draw period.</div>
              </div>
            </>
          )}
        </>
      )}
    </Container>
  );
}

/* ----------------------------- components ----------------------------- */

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
      <div className="mb-1 text-xs text-neutral-400">{title}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}

function EntriesCard({
  tone,
  title,
  lines,
  closes,
}: {
  tone?: "primary" | "amber";
  title: string;
  lines: [string, string][];
  closes: Date;
}) {
  const border =
    tone === "amber"
      ? "border-amber-400/30 ring-1 ring-amber-400/15"
      : "border-neutral-800";

  const dateStr = closes.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });

  return (
    <div className={`rounded-2xl ${border} bg-neutral-900 p-4`}>
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-2 divide-y divide-neutral-800 rounded-xl border border-neutral-800 bg-neutral-950">
        {lines.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between px-3 py-2 text-sm">
            <span className="text-neutral-400">{k}</span>
            <span className="font-medium">{v}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 text-xs text-neutral-500">Closes: {dateStr}</div>
    </div>
  );
}

/* ----------------------------- utils ----------------------------- */

function fmt(n: number | string): string {
  if (typeof n === "string") return n;
  try {
    return new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 }).format(n);
  } catch {
    return String(n);
  }
}