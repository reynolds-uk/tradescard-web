// app/member/rewards/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import PrimaryButton from "@/components/PrimaryButton";
import { useMe } from "@/lib/useMe";
import { useMeReady } from "@/lib/useMeReady";
import { API_BASE } from "@/lib/config";

type Tier = "access" | "member" | "pro";
type AppStatus = "free" | "trial" | "paid" | "inactive";
const isActiveStatus = (s?: string) => s === "paid" || s === "trial";

type RewardsSummary = {
  lifetime_points: number;
  points_this_month: number;
};

export default function MemberRewardsPage() {
  const router = useRouter();
  const me = useMe();                 // { user?, tier?, status? }
  const ready = useMeReady();         // avoid auth flash

  const tier: Tier = (me?.tier as Tier) ?? "access";
  const status: AppStatus = (me?.status as AppStatus) ?? "free";
  const isPaid = (tier === "member" || tier === "pro") && isActiveStatus(status);
  const uid = me?.user?.id ?? null;

  // If not paid (stale cookie etc.), bounce to public rewards (calm redirect)
  useEffect(() => {
    if (!ready) return;
    if (!isPaid) router.replace("/rewards");
  }, [ready, isPaid, router]);

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<RewardsSummary | null>(null);
  const [error, setError] = useState<string>("");

  // Tier multipliers
  const boost = tier === "pro" ? 1.5 : 1.25; // paid-only page; default to Member boost
  const boostLabel = tier === "pro" ? "1.5×" : "1.25×";

  // Derived entries (client-side estimate for display only)
  const monthPoints = summary?.points_this_month ?? 0;
  const lifetimePoints = summary?.lifetime_points ?? 0;
  const monthEntries = Math.floor(monthPoints * boost);
  const lifetimeEntries = lifetimePoints; // lifetime draw = 1 entry per lifetime point

  // Fixture placeholders (wire to DB later)
  const now = new Date();
  const currentPrizeClose = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const lifetimePrizeClose = new Date(now.getFullYear(), 11, 31);

  // Fetch rewards once we *know* there is a paid user
  useEffect(() => {
    if (!ready || !uid || !isPaid) return;

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
            lifetime_points: Number.isFinite(data.lifetime_points) ? data.lifetime_points : 0,
            points_this_month: Number.isFinite(data.points_this_month) ? data.points_this_month : 0,
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
  }, [ready, uid, isPaid]);

  const subtitle = useMemo(() => {
    if (!ready) return "Loading…";
    return "Your points and entries update automatically as you use TradeCard.";
  }, [ready]);

  // Calm state while redirecting
  if (ready && !isPaid) {
    return (
      <Container>
        <PageHeader title="Rewards" subtitle="Taking you to the public rewards view…" />
      </Container>
    );
  }

  return (
    <Container>
      <PageHeader title="Rewards" subtitle={subtitle} />

      {/* Errors */}
      {error && (
        <div className="mb-4 rounded border border-red-600/40 bg-red-900/10 px-3 py-2 text-red-300 text-sm" role="alert">
          {error}
        </div>
      )}

      {/* Skeleton */}
      {(!ready || loading) && (
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl border border-neutral-800 bg-neutral-900/60 animate-pulse" />
          ))}
        </div>
      )}

      {/* Content */}
      {ready && !loading && (
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
                <p className="text-neutral-400">Earn activity points when you redeem partner deals.</p>
                <div className="mt-2">
                  <Link href="/offers" className="inline-block rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-xs hover:bg-neutral-800">
                    Browse offers
                  </Link>
                </div>
              </li>
              <li className="rounded-xl border border-neutral-800 bg-neutral-950 p-3">
                <div className="font-medium">Refer a mate</div>
                <p className="text-neutral-400">Get a points boost when your referral activates their membership.</p>
                <div className="mt-2">
                  <Link href="/account/referrals" className="inline-block rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-xs hover:bg-neutral-800">
                    Get referral link
                  </Link>
                </div>
              </li>
              <li className="rounded-xl border border-neutral-800 bg-neutral-950 p-3">
                <div className="font-medium">Stay on Pro</div>
                <p className="text-neutral-400">Keep the 1.5× boost. Long-tenure multipliers apply at 12+ months.</p>
                <div className="mt-2">
                  <Link href="/account" className="inline-block rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-xs hover:bg-neutral-800">
                    Manage plan
                  </Link>
                </div>
              </li>
              <li className="rounded-xl border border-neutral-800 bg-neutral-950 p-3">
                <div className="font-medium">Stay active</div>
                <p className="text-neutral-400">Periodic boosts for consecutive active months. Watch this space.</p>
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
