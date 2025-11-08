// app/account/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import PrimaryButton from "@/components/PrimaryButton";
import { useMe } from "@/lib/useMe";
import { routeToJoin } from "@/lib/routeToJoin";
import { shouldShowTrial, TRIAL_COPY } from "@/lib/trial";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://tradescard-api.vercel.app";

type Tier = "access" | "member" | "pro";

type ApiAccount = {
  user_id: string;
  email: string;
  full_name?: string | null;
  members: null | {
    status: "active" | "trialing" | "past_due" | "canceled" | "free" | string;
    tier: Tier | string;
    current_period_end: string | null;
  };
};

type MeView = {
  user_id: string;
  email: string;
  name?: string | null;
  tier: Tier;
  status: string;
  renewal_date: string | null;
  joined_at?: string | null;
};

type RewardsSummary = {
  lifetime_points: number;
  points_this_month: number;
};

const TIER_COPY: Record<Tier, { label: string; boost: string; priceShort: string }> = {
  access: { label: "ACCESS", boost: "1.00×", priceShort: "£0" },
  member: { label: "MEMBER", boost: "1.25×", priceShort: "£2.99" },
  pro: { label: "PRO", boost: "1.50×", priceShort: "£7.99" },
};

function Badge({
  children,
  tone = "muted",
}: {
  children: string | number;
  tone?: "ok" | "warn" | "bad" | "muted";
}) {
  const map = {
    ok: "bg-green-900/30 text-green-300",
    warn: "bg-amber-900/30 text-amber-200",
    bad: "bg-red-900/30 text-red-300",
    muted: "bg-neutral-800 text-neutral-300",
  } as const;
  return <span className={`rounded px-2 py-0.5 text-xs ${map[tone]}`}>{children}</span>;
}

export default function AccountPage() {
  const me = useMe(); // { user?, email?, tier, status, ready }
  const showTrial = shouldShowTrial(me);

  // Supabase only for signOut()
  const supabase = useMemo(
    () =>
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const abortRef = useRef<AbortController | null>(null);
  const actionsRef = useRef<HTMLDivElement | null>(null);

  const [view, setView] = useState<MeView | null>(null);
  const [rewards, setRewards] = useState<RewardsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pulseActions, setPulseActions] = useState(false);

  const mapToView = (a: ApiAccount, joined_at?: string | null): MeView => ({
    user_id: a.user_id,
    email: a.email,
    name: a.full_name ?? null,
    tier: ((a.members?.tier as Tier) ?? "access") as Tier,
    status: a.members?.status ?? "free",
    renewal_date: a.members?.current_period_end ?? null,
    joined_at: joined_at ?? null,
  });

  async function fetchEverything() {
    setError("");
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    const uid = me?.user?.id;
    if (!uid) {
      setView(null);
      setRewards(null);
      return;
    }

    // Account
    const accRes = await fetch(
      `${API_BASE}/api/account?user_id=${encodeURIComponent(uid)}`,
      { cache: "no-store", signal: abortRef.current.signal }
    );
    if (!accRes.ok) throw new Error(`/api/account failed: ${accRes.status}`);
    const acc: ApiAccount = await accRes.json();
    // joined_at comes from auth; fall back to undefined
    setView(mapToView(acc, (me?.user as { created_at?: string })?.created_at ?? null));

    // Rewards summary (optional)
    const rw = await fetch(
      `${API_BASE}/api/rewards/summary?user_id=${encodeURIComponent(uid)}`,
      { cache: "no-store", signal: abortRef.current.signal }
    );
    if (rw.ok) {
      const sum: RewardsSummary = await rw.json();
      setRewards({
        lifetime_points: Number.isFinite(sum.lifetime_points) ? sum.lifetime_points : 0,
        points_this_month: Number.isFinite(sum.points_this_month) ? sum.points_this_month : 0,
      });
    } else {
      setRewards(null);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        // Clean noisy params (Stripe/auth)
        try {
          const url = new URL(window.location.href);
          if (
            ["status", "success", "canceled", "auth_error"].some((k) =>
              url.searchParams.has(k)
            )
          ) {
            window.history.replaceState({}, "", url.pathname + url.hash);
          }
        } catch {
          /* no-op */
        }
        await fetchEverything();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    })();

    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.user?.id]);

  // Spotlight actions if arriving from an upgrade path
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash === "#upgrade" && actionsRef.current) {
      actionsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      setPulseActions(true);
      const t = setTimeout(() => setPulseActions(false), 1600);
      return () => clearTimeout(t);
    }
  }, [loading]);

  const startMembership = async (plan: "member" | "pro") => {
    try {
      setBusy(true);
      setError("");
      if (!me?.user) {
        // Not signed in: route to /join with intent
        routeToJoin(plan);
        return;
      }
      const res = await fetch(`${API_BASE}/api/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: me.user.id,
          email: me.email,
          plan,
          // hint: API can choose intro price if configured
          trial: showTrial,
          next: "/welcome",
        }),
        keepalive: true,
      });
      const json = await res.json().catch(() => ({} as { url?: string; error?: string }));
      if (!res.ok || !json.url) throw new Error(json?.error || "Checkout failed");
      window.location.href = json.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start checkout");
    } finally {
      setBusy(false);
    }
  };

  const openBillingPortal = async () => {
    try {
      setBusy(true);
      setError("");
      if (!me?.user) {
        routeToJoin(); // ask user to sign in
        return;
      }
      const res = await fetch(`${API_BASE}/api/stripe/portal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: me.user.id }),
      });
      const json = await res.json().catch(() => ({} as { url?: string; error?: string }));
      if (!res.ok || !json?.url) throw new Error(json?.error || `Portal failed (${res.status})`);
      window.location.href = json.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to open billing portal");
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      window.location.href = "/";
    }
  };

  const refresh = async () => {
    try {
      setLoading(true);
      await fetchEverything();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Refresh failed");
    } finally {
      setLoading(false);
    }
  };

  // UI helpers
  const statusBadge = (status: string) => {
    if (status === "active") return <Badge tone="ok">active</Badge>;
    if (status === "trialing") return <Badge tone="warn">trialing</Badge>;
    if (status === "past_due") return <Badge tone="bad">past due</Badge>;
    if (status === "canceled") return <Badge tone="muted">canceled</Badge>;
    return <Badge tone="muted">{status}</Badge>;
  };

  const prettyDate = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleDateString() : "—";

  const canJoin =
    !view || view.tier === "access" || view.status === "canceled" || view.status === "free";
  const canUpgrade = view?.status !== "canceled" && view?.tier === "member";
  const canDowngrade = view?.status !== "canceled" && view?.tier === "pro";
  const isActive = view?.status === "active" || view?.status === "trialing";

  // Trial-aware labels
  const memberCta = showTrial ? TRIAL_COPY : "Join as Member (£2.99/mo)";
  const proCta = "Go Pro (£7.99/mo)";
  const upgradeToProCta = "Upgrade to Pro";

  return (
    <Container>
      <PageHeader
        title="My Account"
        subtitle="Manage your membership, card, billing and rewards eligibility."
        aside={
          <button
            onClick={refresh}
            className="rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm hover:bg-neutral-800 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        }
      />

      {error && (
        <div className="mb-4 rounded border border-red-600/40 bg-red-900/10 px-3 py-2 text-red-300">
          {error}
        </div>
      )}

      {/* Logged out */}
      {!loading && !view && (
        <div className="rounded-xl border border-neutral-800 p-5 bg-neutral-900/60">
          <p className="font-medium mb-2">You’re not signed in.</p>
          <p className="text-neutral-400 mb-3">
            Use your email to get a magic sign-in link. No password needed.
          </p>
          <PrimaryButton onClick={() => routeToJoin()}>
            Sign in / Join
          </PrimaryButton>
        </div>
      )}

      {/* Logged in */}
      {!loading && view && (
        <div className="space-y-6">
          {/* Status cues */}
          {view.status === "past_due" && (
            <div className="rounded-lg border border-red-700/40 bg-red-900/10 p-3 text-sm text-red-300">
              Payment issue detected. Update your billing details to keep benefits active.
              <button onClick={openBillingPortal} className="ml-3 underline underline-offset-4">
                Manage billing
              </button>
            </div>
          )}
          {view.status === "trialing" && (
            <div className="rounded-lg border border-amber-600/40 bg-amber-500/10 p-3 text-sm text-amber-200">
              You’re on a trial. Upgrade, switch, or cancel any time from billing.
              <button onClick={openBillingPortal} className="ml-3 underline underline-offset-4">
                Open billing portal
              </button>
            </div>
          )}

          {/* Virtual card */}
          <section className="rounded-2xl border border-neutral-800 p-5 bg-gradient-to-br from-neutral-900 to-neutral-950">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm text-neutral-400">My TradesCard</div>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <div className="text-2xl font-semibold">TradesCard</div>
                  <Badge tone="muted">{TIER_COPY[view.tier].label}</Badge>
                  {statusBadge(view.status)}
                </div>
              </div>
              <div className="rounded-lg border border-dashed border-neutral-700 px-3 py-2 text-xs text-neutral-400">
                QR / Wallet coming soon
              </div>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <div className="truncate">
                <span className="opacity-60">Name:</span> {view.name || "—"}
              </div>
              <div className="truncate">
                <span className="opacity-60">Email:</span> {view.email}
              </div>
              <div className="truncate">
                <span className="opacity-60">Member ID:</span> {view.user_id}
                <button
                  className="ml-2 rounded bg-neutral-800 px-2 py-0.5 text-xs hover:bg-neutral-700"
                  onClick={() => navigator.clipboard.writeText(view.user_id)}
                >
                  Copy ID
                </button>
              </div>
              <div className="truncate">
                <span className="opacity-60">Joined:</span> {prettyDate(view.joined_at)}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border border-neutral-800 p-3">
                <div className="text-2xl font-semibold">{TIER_COPY[view.tier].boost}</div>
                <div className="text-xs text-neutral-400 mt-1">Tier boost</div>
              </div>
              <div className="rounded-lg border border-neutral-800 p-3">
                <div className="text-2xl font-semibold">{TIER_COPY[view.tier].priceShort}</div>
                <div className="text-xs text-neutral-400 mt-1">per month</div>
              </div>
              <div className="rounded-lg border border-neutral-800 p-3">
                <div className="text-2xl font-semibold">{prettyDate(view.renewal_date)}</div>
                <div className="text-xs text-neutral-400 mt-1">Renews</div>
              </div>
            </div>
          </section>

          {/* Rewards eligibility */}
          <section className="rounded-xl border border-neutral-800 p-5">
            <div className="flex items-center justify-between">
              <div className="font-medium">Rewards eligibility</div>
              <div className="text-xs text-neutral-400">
                {isActive ? "Eligible while membership is active" : "Not eligible"}
              </div>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-neutral-800 p-3">
                <div className="text-sm text-neutral-400">Points this month</div>
                <div className="mt-1 text-2xl font-semibold">
                  {rewards ? rewards.points_this_month : "—"}
                </div>
              </div>
              <div className="rounded-lg border border-neutral-800 p-3">
                <div className="text-sm text-neutral-400">Lifetime points</div>
                <div className="mt-1 text-2xl font-semibold">
                  {rewards ? rewards.lifetime_points : "—"}
                </div>
              </div>
              <div className="rounded-lg border border-neutral-800 p-3">
                <div className="text-sm text-neutral-400">Status</div>
                <div className="mt-1">{statusBadge(view.status)}</div>
              </div>
            </div>
            <p className="mt-3 text-sm text-neutral-400">
              Cancelling or downgrading stops new entries immediately. Lifetime points remain
              on your profile but do not qualify you for draws while inactive.
            </p>
          </section>

          {/* Plan actions */}
          <section
            ref={actionsRef}
            className={`rounded-xl border border-neutral-800 p-5 ${pulseActions ? "animate-pulse" : ""}`}
          >
            <div className="font-medium mb-3">Plan actions</div>

            {canJoin && (
              <div className="flex flex-wrap gap-2">
                <PrimaryButton onClick={() => startMembership("member")} disabled={busy}>
                  {busy ? "Opening…" : memberCta}
                </PrimaryButton>
                <button
                  onClick={() => startMembership("pro")}
                  disabled={busy}
                  className="px-4 py-2 rounded-lg border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-60"
                >
                  {busy ? "Opening…" : "Go Pro (£7.99/mo)"}
                </button>
              </div>
            )}

            {canUpgrade && (
              <div className="flex flex-wrap gap-2">
                <PrimaryButton onClick={() => startMembership("pro")} disabled={busy}>
                  {busy ? "Opening…" : upgradeToProCta}
                </PrimaryButton>
                <button
                  onClick={openBillingPortal}
                  disabled={busy}
                  className="px-4 py-2 rounded-lg border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-60"
                >
                  {busy ? "Opening…" : "Manage billing / Cancel"}
                </button>
              </div>
            )}

            {canDowngrade && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => startMembership("member")}
                  disabled={busy}
                  className="px-4 py-2 rounded-lg border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-60"
                >
                  {busy ? "Opening…" : "Switch to Member"}
                </button>
                <button
                  onClick={openBillingPortal}
                  disabled={busy}
                  className="px-4 py-2 rounded-lg border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-60"
                >
                  {busy ? "Opening…" : "Manage billing / Cancel"}
                </button>
              </div>
            )}

            {/* Always show a way to cancel for transparency */}
            {!canJoin && !canUpgrade && !canDowngrade && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={openBillingPortal}
                  disabled={busy}
                  className="px-4 py-2 rounded-lg border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-60"
                >
                  {busy ? "Opening…" : "Manage billing / Cancel"}
                </button>
              </div>
            )}

            <p className="mt-3 text-xs text-neutral-500">
              You can cancel any time. Cancelling stops reward entries immediately.
            </p>
          </section>

          {/* Sign out */}
          <div className="flex justify-end">
            <button
              onClick={signOut}
              className="px-4 py-2 rounded-lg border border-neutral-700 bg-neutral-900 hover:bg-neutral-800"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </Container>
  );
}