"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import HeaderAuth from "../header-client";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://tradescard-api.vercel.app";

type ApiAccount = {
  user_id: string;
  email: string;
  full_name?: string | null;
  members: null | {
    status: "active" | "trialing" | "past_due" | "canceled" | "free" | string;
    tier: "access" | "member" | "pro" | string;
    current_period_end: string | null;
    stripe_customer_id?: string | null;
    stripe_subscription_id?: string | null;
  };
};

type Me = {
  user_id: string;
  email: string;
  name?: string | null;
  tier: "access" | "member" | "pro";
  status: string;
  renewal_date: string | null;
};

const TIER_COPY: Record<Me["tier"], { label: string; boost: string; priceShort: string; priceLong: string }> = {
  access: { label: "ACCESS", boost: "1.00×", priceShort: "£0",     priceLong: "Free" },
  member: { label: "MEMBER", boost: "1.25×", priceShort: "£2.99",  priceLong: "£2.99 / month" },
  pro:    { label: "PRO",    boost: "1.50×", priceShort: "£7.99",  priceLong: "£7.99 / month" },
};

export default function AccountPage() {
  const supabase = useMemo(
    () =>
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const abortRef = useRef<AbortController | null>(null);

  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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

  async function fetchAccount() {
    setError("");
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    const user = await currentUser();
    if (!user) {
      setMe(null);
      return;
    }

    const r = await fetch(
      `${API_BASE}/api/account?user_id=${encodeURIComponent(user.id)}`,
      { cache: "no-store", signal: abortRef.current.signal }
    );
    if (!r.ok) throw new Error(`/api/account failed: ${r.status}`);
    const acc: ApiAccount = await r.json();
    setMe(mapToMe(acc));
  }

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        // Clean Stripe/auth params
        const url = new URL(window.location.href);
        if (["status", "success", "canceled", "auth_error"].some((k) => url.searchParams.has(k))) {
          window.history.replaceState({}, "", url.pathname);
        }
        await fetchAccount();
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Something went wrong";
        setError(msg);
      } finally {
        setLoading(false);
      }
    })();

    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startMembership = async (plan: "member" | "pro") => {
    try {
      setBusy(true);
      setError("");

      const user = await currentUser();
      if (!user) {
        alert("Please sign in first using the form in the header or below.");
        return;
      }

      const res = await fetch(`${API_BASE}/api/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id, email: user.email, plan }),
        keepalive: true,
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.url) throw new Error(json?.error || "Checkout failed");
      window.location.href = json.url;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not start checkout";
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  const openBillingPortal = async () => {
    try {
      setBusy(true);
      setError("");

      const user = await currentUser();
      if (!user) {
        alert("Please sign in first.");
        return;
      }

      const res = await fetch(`${API_BASE}/api/stripe/portal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.url) throw new Error(json?.error || `Portal failed (${res.status})`);
      window.location.href = json.url;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to open billing portal";
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const refresh = async () => {
    try {
      setLoading(true);
      await fetchAccount();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Refresh failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const TierBadge = ({ tier }: { tier: Me["tier"] }) => (
    <span className="rounded bg-neutral-800 px-2 py-0.5 text-xs">{tier.toUpperCase()}</span>
  );

  const StatusBadge = ({ status }: { status: string }) => {
    const cls =
      status === "active"
        ? "bg-green-900/30 text-green-300"
        : status === "trialing"
        ? "bg-amber-900/30 text-amber-300"
        : status === "past_due"
        ? "bg-red-900/30 text-red-300"
        : "bg-neutral-800 text-neutral-300";
    return <span className={`rounded px-2 py-0.5 text-xs ${cls}`}>{status}</span>;
  };

  const offersHref = "/offers";
  const benefitsHref = "/benefits";

  return (
    <Container>
      <PageHeader
        title="My Account"
        subtitle="Manage your membership, billing and perks."
        aside={
          <button
            onClick={refresh}
            className="rounded bg-neutral-800 hover:bg-neutral-700 px-3 py-2"
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
      {!loading && !me && (
        <div className="space-y-4">
          <div className="rounded-xl border border-neutral-800 p-5 bg-neutral-900/60">
            <p className="font-medium mb-2">You’re not signed in.</p>
            <p className="text-neutral-400 mb-3">Enter your email to get a magic sign-in link.</p>
            <HeaderAuth />
          </div>

          <div className="rounded-xl border border-neutral-800 p-5">
            <h2 className="font-medium mb-2">Why become a member?</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(["access", "member", "pro"] as const).map((t) => (
                <div key={t} className="rounded-lg border border-neutral-800 p-4">
                  <div className="flex items-baseline justify-between">
                    <div className="text-sm text-neutral-400">{t === "access" ? "Free" : "Paid"}</div>
                    <span className="rounded bg-neutral-800 px-2 py-0.5 text-xs">{TIER_COPY[t].label}</span>
                  </div>
                  <div className="mt-2 text-lg font-semibold">{TIER_COPY[t].priceLong}</div>
                  <div className="text-xs text-neutral-500">Rewards boost: {TIER_COPY[t].boost}</div>
                  <ul className="mt-3 space-y-1 text-neutral-300">
                    <li>• All public offers</li>
                    {t !== "access" ? (
                      <>
                        <li>• Prize draw entries</li>
                        <li>• Tier points boost ({TIER_COPY[t].boost})</li>
                      </>
                    ) : (
                      <li>• No rewards entries</li>
                    )}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Logged in */}
      {!loading && me && (
        <div className="space-y-6">
          {/* Summary card */}
          <div className="rounded-xl border border-neutral-800 p-5 bg-gradient-to-br from-neutral-900 to-neutral-950">
            <div className="text-sm text-neutral-400">Membership</div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <div className="text-xl font-semibold">TradesCard</div>
              <TierBadge tier={me.tier} />
              <StatusBadge status={me.status} />
            </div>

            <div className="mt-3 grid gap-1 sm:grid-cols-2">
              <div className="truncate"><span className="opacity-60">Name:</span> {me.name || "—"}</div>
              <div className="truncate"><span className="opacity-60">Email:</span> {me.email}</div>
              <div className="truncate"><span className="opacity-60">Member ID:</span> {me.user_id}</div>
              <div>
                <span className="opacity-60">Renews:</span>{" "}
                {me.renewal_date ? new Date(me.renewal_date).toLocaleDateString() : "—"}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border border-neutral-800 p-3">
                <div className="text-2xl font-semibold">{TIER_COPY[me.tier].boost}</div>
                <div className="text-xs text-neutral-400 mt-1">Tier boost</div>
              </div>
              <div className="rounded-lg border border-neutral-800 p-3">
                <div className="text-2xl font-semibold">{TIER_COPY[me.tier].label}</div>
                <div className="text-xs text-neutral-400 mt-1">Plan</div>
              </div>
              <div className="rounded-lg border border-neutral-800 p-3">
                <div className="text-2xl font-semibold">{TIER_COPY[me.tier].priceShort}</div>
                <div className="text-xs text-neutral-400 mt-1">per month</div>
              </div>
            </div>
          </div>

          {/* Plan actions (clear upgrade/downgrade paths) */}
          <div className="rounded-xl border border-neutral-800 p-5">
            <div className="font-medium mb-3">Plan actions</div>

            {/* Access / not active -> join */}
            {(me.tier === "access" || me.status !== "active") && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => startMembership("member")}
                  disabled={busy}
                  className="px-4 py-2 rounded-lg bg-amber-400 text-black font-medium disabled:opacity-60"
                >
                  {busy ? "Opening…" : "Join as Member (£2.99/mo)"}
                </button>
                <button
                  onClick={() => startMembership("pro")}
                  disabled={busy}
                  className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-60"
                >
                  {busy ? "Opening…" : "Go Pro (£7.99/mo)"}
                </button>
              </div>
            )}

            {/* Member -> upgrade / billing */}
            {me.status === "active" && me.tier === "member" && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => startMembership("pro")}
                  disabled={busy}
                  className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-60"
                >
                  {busy ? "Opening…" : "Upgrade to Pro"}
                </button>
                <button
                  onClick={openBillingPortal}
                  disabled={busy}
                  className="px-4 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 disabled:opacity-60"
                >
                  {busy ? "Opening…" : "Manage billing / cancel"}
                </button>
              </div>
            )}

            {/* Pro -> downgrade / billing */}
            {me.status === "active" && me.tier === "pro" && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => startMembership("member")}
                  disabled={busy}
                  className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-60"
                >
                  {busy ? "Opening…" : "Switch to Member"}
                </button>
                <button
                  onClick={openBillingPortal}
                  disabled={busy}
                  className="px-4 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 disabled:opacity-60"
                >
                  {busy ? "Opening…" : "Manage billing / cancel"}
                </button>
              </div>
            )}
          </div>

          {/* Shortcuts */}
          <div className="flex flex-wrap gap-2">
            <a href="/rewards" className="px-4 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800">
              View rewards
            </a>
            <a href={offersHref} className="px-4 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800">
              Browse offers
            </a>
            <a href={benefitsHref} className="px-4 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800">
              View benefits
            </a>
            <button onClick={signOut} className="ml-auto px-4 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800">
              Sign out
            </button>
          </div>
        </div>
      )}
    </Container>
  );
}