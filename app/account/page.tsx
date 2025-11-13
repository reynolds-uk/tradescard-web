// app/account/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";

import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import PrimaryButton from "@/components/PrimaryButton";
import ManageBillingButton from "@/components/ManageBillingButton";
import { routeToJoin } from "@/lib/routeToJoin";
import { shouldShowTrial, TRIAL_COPY } from "@/lib/trial";
import { useSessionUser, useProfile, useMember } from "@/lib/data";
import { API_BASE } from "@/lib/apiBase";

type Tier = "access" | "member" | "pro";

type RewardsSummary = {
  lifetime_points: number;
  points_this_month: number;
};

const TIER_META: Record<
  Tier,
  { label: string; boost: string; priceShort: string; tagline: string }
> = {
  access: {
    label: "ACCESS",
    boost: "1.00×",
    priceShort: "£0",
    tagline: "Browse public offers. Upgrade any time.",
  },
  member: {
    label: "MEMBER",
    boost: "1.25×",
    priceShort: "£2.99",
    tagline: "Core benefits unlocked. Monthly rewards included.",
  },
  pro: {
    label: "PRO",
    boost: "1.50×",
    priceShort: "£7.99",
    tagline: "All benefits, early-access deals, biggest rewards boosts.",
  },
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
  return (
    <span className={`rounded px-2 py-0.5 text-xs ${map[tone]}`}>
      {children}
    </span>
  );
}

const statusBadge = (s?: string) => {
  if (s === "active") return <Badge tone="ok">active</Badge>;
  if (s === "trialing") return <Badge tone="warn">trialing</Badge>;
  if (s === "past_due") return <Badge tone="bad">past due</Badge>;
  if (s === "canceled") return <Badge tone="muted">canceled</Badge>;
  return <Badge tone="muted">{s || "free"}</Badge>;
};

const prettyDate = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("en-GB", {
        year: "numeric",
        month: "short",
        day: "2-digit",
      })
    : "—";

export default function AccountPage() {
  // Session & data
  const { data: me } = useSessionUser();
  const userId = me?.id ?? null;
  const { data: profile } = useProfile(userId);
  const { data: member } = useMember(userId);

  const tier: Tier = (member?.tier as Tier) ?? "access";
  const status = member?.status ?? "free";
  const renewal = member?.current_period_end ?? null;
  const showTrial = shouldShowTrial({ tier } as any);
  const isSignedIn = !!userId;

  // Supabase (sign-out + profile update)
  const supabase = useMemo(
    () =>
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      ),
    [],
  );

  // Local state
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState(profile?.name ?? "");
  const [savingName, setSavingName] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);
  const [error, setError] = useState<string>("");

  const [rewards, setRewards] = useState<RewardsSummary | null>(null);
  const actionsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => setReady(true), []);
  useEffect(() => setName(profile?.name ?? ""), [profile?.name]);

  // Load rewards once signed in
  useEffect(() => {
    if (!isSignedIn || !userId) {
      setRewards(null);
      setLoading(false);
      return;
    }

    (async () => {
      try {
        setLoading(true);
        const rw = await fetch(
          `${API_BASE}/api/rewards/summary?user_id=${encodeURIComponent(
            userId,
          )}`,
        );
        if (rw.ok) {
          const j = (await rw.json()) as RewardsSummary;
          setRewards({
            lifetime_points: Number(j?.lifetime_points) || 0,
            points_this_month: Number(j?.points_this_month) || 0,
          });
        } else {
          setRewards(null);
        }
      } catch {
        setRewards(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [isSignedIn, userId]);

  // Actions
  const startMembership = async (plan: "member" | "pro") => {
    if (!userId) {
      routeToJoin(plan);
      return;
    }
    try {
      setError("");
      const res = await fetch(`${API_BASE}/api/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, cycle: "month", email: profile?.email }),
      });
      const j = await res.json().catch(() => ({} as any));
      if (!res.ok || !j?.url) {
        throw new Error(j?.error || "Checkout failed");
      }
      window.location.href = j.url;
    } catch (e: any) {
      setError(e?.message || "Could not start checkout");
    }
  };

  const saveName = async () => {
    if (!userId) return;
    try {
      setSavingName(true);
      setNameSaved(false);
      const { error: upErr } = await supabase
        .from("profiles")
        .upsert(
          {
            user_id: userId,
            email: profile?.email ?? null,
            name: name || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        );
      if (upErr) throw upErr;
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 2000);
    } catch (e: any) {
      setError(e?.message || "We couldn’t save your details just now.");
    } finally {
      setSavingName(false);
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      window.location.href = "/";
    }
  };

  // Capability flags
  const canJoin =
    tier === "access" || status === "canceled" || status === "free";
  const canUpgrade = tier === "member" && status !== "canceled";
  const canDowngrade = tier === "pro" && status !== "canceled";
  const isActive = status === "active" || status === "trialing";

  // Sticky CTA
  const stickyLabel = canJoin
    ? showTrial
      ? TRIAL_COPY
      : "Become a Member"
    : canUpgrade
    ? "Upgrade to Pro"
    : canDowngrade
    ? "Manage billing"
    : "";
  const stickyAction = () => {
    if (canJoin) return startMembership("member");
    if (canUpgrade) return startMembership("pro");
    if (canDowngrade)
      document.getElementById("billing-portal-click")?.click();
  };
  const showSticky =
    ready &&
    !loading &&
    isSignedIn &&
    (canJoin || canUpgrade || canDowngrade);

  return (
    <>
      {/* Sticky actions (mobile) */}
      {showSticky && (
        <div
          className="fixed inset-x-0 bottom-0 z-40 md:hidden border-t border-neutral-800 bg-neutral-950/95 backdrop-blur supports-[backdrop-filter]:bg-neutral-950/70"
          role="region"
          aria-label="Account quick action"
        >
          <div className="safe-inset-bottom" />
          <div className="mx-auto max-w-5xl px-4 py-3">
            <PrimaryButton
              onClick={stickyAction}
              className="w-full text-base py-3"
            >
              {stickyLabel}
            </PrimaryButton>
            <div className="mt-2 text-center text-[11px] text-neutral-400">
              {canJoin && "Billed monthly • Cancel any time"}
              {canUpgrade &&
                "Pro unlocks bigger boosts & Pro-only offers"}
              {canDowngrade &&
                "Manage plan, payment method or cancel"}
            </div>
          </div>
        </div>
      )}

      <Container className={showSticky ? "safe-bottom-pad" : ""}>
        <PageHeader
          title="My Account"
          subtitle="Manage your membership, billing, details and rewards."
          aside={
            ready ? (
              <div className="text-sm text-neutral-400">
                {isSignedIn ? (
                  <span className="hidden sm:inline">Signed in as</span>
                ) : (
                  <span className="hidden sm:inline">Not signed in</span>
                )}{" "}
                <span className="font-mono text-neutral-300 truncate inline-block max-w-xs align-bottom">
                  {profile?.email ?? "—"}
                </span>
              </div>
            ) : null
          }
        />

        {error && (
          <div className="mb-4 rounded border border-red-600/40 bg-red-900/10 px-3 py-2 text-red-300">
            {error}
          </div>
        )}

        {/* Logged-out simple prompt */}
        {!isSignedIn && (
          <div className="rounded-xl border border-neutral-800 p-5 bg-neutral-900/60">
            <p className="font-medium mb-2">You’re not signed in.</p>
            <p className="text-neutral-400 mb-3">
              Use your email to get a magic link. No password needed.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => routeToJoin()}
                className="px-4 py-2 rounded-lg border border-neutral-700 bg-neutral-900 hover:bg-neutral-800"
              >
                Join free
              </button>
              <PrimaryButton onClick={() => routeToJoin("member")}>
                {showTrial ? TRIAL_COPY : "Become a Member"}
              </PrimaryButton>
            </div>
          </div>
        )}

        {/* Signed-in layout */}
        {isSignedIn && (
          <div className="grid gap-6 md:grid-cols-3">
            {/* Left column */}
            <section className="md:col-span-2 space-y-6">
              {/* Membership summary */}
              <div className="rounded-2xl border border-neutral-800 p-5 bg-gradient-to-br from-neutral-900 to-neutral-950">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm text-neutral-400">
                      Membership
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <div className="text-2xl font-semibold">
                        TradeCard
                      </div>
                      <Badge tone="muted">
                        {TIER_META[tier].label}
                      </Badge>
                      {statusBadge(status)}
                    </div>
                    <p className="mt-2 text-sm text-neutral-300">
                      {TIER_META[tier].tagline}
                    </p>
                  </div>
                  <div className="rounded-lg border border-dashed border-neutral-700 px-3 py-2 text-xs text-neutral-400">
                    Wallet pass coming soon
                  </div>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  <div className="rounded-lg border border-neutral-800 p-3 text-center">
                    <div className="text-2xl font-semibold">
                      {TIER_META[tier].boost}
                    </div>
                    <div className="text-xs text-neutral-400 mt-1">
                      Tier boost
                    </div>
                  </div>
                  <div className="rounded-lg border border-neutral-800 p-3 text-center">
                    <div className="text-2xl font-semibold">
                      {TIER_META[tier].priceShort}
                    </div>
                    <div className="text-xs text-neutral-400 mt-1">
                      per month
                    </div>
                  </div>
                  <div className="rounded-lg border border-neutral-800 p-3 text-center">
                    <div className="text-2xl font-semibold">
                      {prettyDate(renewal)}
                    </div>
                    <div className="text-xs text-neutral-400 mt-1">
                      Renews
                    </div>
                  </div>
                </div>
              </div>

              {/* Rewards snapshot */}
              <div className="rounded-xl border border-neutral-800 p-5">
                <div className="flex items-center justify-between">
                  <div className="font-medium">Rewards</div>
                  <div className="text-xs text-neutral-400">
                    {isActive
                      ? "Eligible while active"
                      : "Not eligible"}
                  </div>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border border-neutral-800 p-3">
                    <div className="text-sm text-neutral-400">
                      Points this month
                    </div>
                    <div className="mt-1 text-2xl font-semibold">
                      {loading
                        ? "…"
                        : rewards?.points_this_month ?? "—"}
                    </div>
                  </div>
                  <div className="rounded-lg border border-neutral-800 p-3">
                    <div className="text-sm text-neutral-400">
                      Lifetime points
                    </div>
                    <div className="mt-1 text-2xl font-semibold">
                      {loading
                        ? "…"
                        : rewards?.lifetime_points ?? "—"}
                    </div>
                  </div>
                  <div className="rounded-lg border border-neutral-800 p-3">
                    <div className="text-sm text-neutral-400">
                      Status
                    </div>
                    <div className="mt-1">{statusBadge(status)}</div>
                  </div>
                </div>
                <p className="mt-3 text-sm text-neutral-400">
                  Cancelling or downgrading stops new entries
                  immediately. Lifetime points remain on your profile
                  but do not qualify you for draws while inactive.
                </p>
              </div>

              {/* Plan actions */}
              <div
                ref={actionsRef}
                className="rounded-xl border border-neutral-800 p-5"
              >
                <div className="font-medium mb-3">Plan actions</div>

                {canJoin && (
                  <div className="flex flex-wrap gap-2">
                    <PrimaryButton
                      onClick={() => startMembership("member")}
                    >
                      {showTrial
                        ? TRIAL_COPY
                        : "Join as Member (£2.99/mo)"}
                    </PrimaryButton>
                    <button
                      onClick={() => startMembership("pro")}
                      className="px-4 py-2 rounded-lg border border-neutral-700 bg-neutral-900 hover:bg-neutral-800"
                    >
                      Go Pro (£7.99/mo)
                    </button>
                  </div>
                )}

                {canUpgrade && (
                  <div className="flex flex-wrap gap-2">
                    <PrimaryButton
                      onClick={() => startMembership("pro")}
                    >
                      Upgrade to Pro
                    </PrimaryButton>
                    <button
                      onClick={() =>
                        document
                          .getElementById("billing-portal-click")
                          ?.click()
                      }
                      className="px-4 py-2 rounded-lg border border-neutral-700 bg-neutral-900 hover:bg-neutral-800"
                    >
                      Manage billing / Cancel
                    </button>
                  </div>
                )}

                {canDowngrade && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => startMembership("member")}
                      className="px-4 py-2 rounded-lg border border-neutral-700 bg-neutral-900 hover:bg-neutral-800"
                    >
                      Switch to Member
                    </button>
                    <button
                      onClick={() =>
                        document
                          .getElementById("billing-portal-click")
                          ?.click()
                      }
                      className="px-4 py-2 rounded-lg border border-neutral-700 bg-neutral-900 hover:bg-neutral-800"
                    >
                      Manage billing / Cancel
                    </button>
                  </div>
                )}

                {!canJoin && !canUpgrade && !canDowngrade && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() =>
                        document
                          .getElementById("billing-portal-click")
                          ?.click()
                      }
                      className="px-4 py-2 rounded-lg border border-neutral-700 bg-neutral-900 hover:bg-neutral-800"
                    >
                      Manage billing / Cancel
                    </button>
                  </div>
                )}

                <p className="mt-3 text-xs text-neutral-500">
                  You can cancel any time. Cancelling stops reward
                  entries immediately.
                </p>
              </div>
            </section>

            {/* Right column */}
            <aside className="space-y-6">
              {/* Your details */}
              <div className="rounded-xl border border-neutral-800 p-5">
                <div className="font-medium mb-3">Your details</div>
                <div className="grid gap-3">
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-xs text-neutral-400 mb-1"
                    >
                      Name{" "}
                      <span className="text-neutral-500">
                        (optional)
                      </span>
                    </label>
                    <input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
                      placeholder="e.g. Alex Smith"
                    />
                    <div className="mt-2 flex gap-2">
                      <PrimaryButton
                        onClick={saveName}
                        disabled={savingName}
                      >
                        {savingName ? "Saving…" : "Save"}
                      </PrimaryButton>
                      {nameSaved && (
                        <span className="text-xs text-green-300 self-center">
                          Saved ✓
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-sm text-neutral-300">
                    <div className="opacity-60">Email</div>
                    <div className="font-mono truncate max-w-xs">
                      {profile?.email ?? "—"}
                    </div>
                  </div>
                  <div className="text-sm text-neutral-300">
                    <div className="opacity-60">Member ID</div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono truncate max-w-xs">
                        {userId}
                      </span>
                      <button
                        className="rounded bg-neutral-800 px-2 py-0.5 text-xs hover:bg-neutral-700"
                        onClick={() =>
                          userId &&
                          navigator.clipboard.writeText(userId)
                        }
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Billing */}
              <div className="rounded-xl border border-neutral-800 p-5">
                <div className="font-medium mb-1">Billing</div>
                <p className="text-sm text-neutral-400">
                  Manage your plan, update card, view invoices or cancel.
                </p>
                <div className="mt-3">
                  {/* Hidden helper so other buttons can trigger the billing portal */}
                  <button
                    id="billing-portal-click"
                    type="button"
                    className="hidden"
                    onClick={() => {
                      // This will be handled by the ManageBillingButton
                      // which triggers the Stripe customer portal.
                    }}
                  />
                  <ManageBillingButton className="mt-1" />
                </div>
                <div className="mt-3 text-xs text-neutral-500">
                  Next renewal: {prettyDate(renewal)}
                </div>
              </div>

              {/* Sign out */}
              <div className="rounded-xl border border-neutral-800 p-5">
                <div className="font-medium mb-2">Security</div>
                <button
                  onClick={signOut}
                  className="px-4 py-2 rounded-lg border border-neutral-700 bg-neutral-900 hover:bg-neutral-800"
                >
                  Sign out
                </button>
              </div>
            </aside>
          </div>
        )}
      </Container>
    </>
  );
}