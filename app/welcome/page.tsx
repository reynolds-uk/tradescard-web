"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import { useJoinModal } from "@/components/JoinModalContext";
import { track } from "@/lib/track";

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

type Me = {
  user_id: string;
  email: string;
  full_name?: string | null;
  tier: Tier;
  status: string;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://tradescard-api.vercel.app";

// --- Trial flags (match Account page)
const TRIAL = process.env.NEXT_PUBLIC_TRIAL_ACTIVE === "true";
const TRIAL_COPY = process.env.NEXT_PUBLIC_TRIAL_COPY || "Try Member for £1 (90 days)";

const TIER_COPY: Record<Tier, { label: string; blurb: string }> = {
  access: {
    label: "ACCESS",
    blurb:
      "You can browse and redeem public offers. Upgrade any time to unlock benefits and monthly rewards.",
  },
  member: {
    label: "MEMBER",
    blurb:
      "You’ve unlocked core benefits and monthly rewards entries. Explore offers and start saving today.",
  },
  pro: {
    label: "PRO",
    blurb:
      "You’ve unlocked all benefits, early-access deals and the highest monthly rewards entries.",
  },
};

export default function WelcomePage() {
  const supabase = useMemo(
    () =>
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );
  const { openJoin } = useJoinModal();

  const [me, setMe] = useState<Me | null>(null);
  const [copyOk, setCopyOk] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    track("welcome_view");

    (async () => {
      try {
        setErr("");

        const { data } = await supabase.auth.getSession();
        const user = data?.session?.user ?? null;

        if (!user) {
          setMe(null);
          return;
        }

        const r = await fetch(
          `${API_BASE}/api/account?user_id=${encodeURIComponent(user.id)}`,
          { cache: "no-store" }
        );
        if (!r.ok) throw new Error(`/api/account ${r.status}`);

        const a: ApiAccount = await r.json();
        const tier = ((a.members?.tier as Tier) ?? "access") as Tier;
        const status = a.members?.status ?? (tier === "access" ? "free" : "inactive");

        setMe({
          user_id: a.user_id,
          email: a.email,
          full_name: a.full_name ?? null,
          tier,
          status,
        });
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Something went wrong");
      }
    })();
  }, [supabase]);

  const copyCardId = async () => {
    if (!me) return;
    try {
      await navigator.clipboard.writeText(me.user_id);
      setCopyOk(true);
      track("welcome_copy_card", { tier: me.tier });
      setTimeout(() => setCopyOk(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const tier = me?.tier ?? "access";
  const cardLabel = me ? TIER_COPY[tier].label : "ACCESS";
  const blurb = me ? TIER_COPY[tier].blurb : TIER_COPY.access.blurb;

  // Trial-aware CTA text for Access users
  const accessCta = TRIAL ? TRIAL_COPY : "Become a Member (£2.99/mo)";

  return (
    <Container>
      <PageHeader
        title="Welcome to TradesCard"
        subtitle="Here’s your card and the quickest next steps to start getting value."
      />

      {TRIAL && (
        <div className="mb-4 rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-200">
          Limited-time offer: {TRIAL_COPY}
        </div>
      )}

      {err && (
        <div className="mb-4 rounded border border-red-600/40 bg-red-900/10 p-3 text-red-300">
          {err}
        </div>
      )}

      {/* Card */}
      <div className="rounded-2xl border border-neutral-800 bg-gradient-to-br from-neutral-900 to-neutral-950 p-5">
        <div className="text-sm text-neutral-400">Your digital card</div>
        <div className="mt-2 grid gap-3 md:grid-cols-3">
          <div className="md:col-span-2">
            <div className="text-2xl font-semibold">TradesCard</div>
            <div className="mt-1 text-sm text-neutral-300">
              {me?.full_name ?? me?.email ?? "—"}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="rounded-lg border border-neutral-800 p-3 text-center">
                <div className="text-xl font-semibold">{cardLabel}</div>
                <div className="mt-1 text-xs text-neutral-400">Tier</div>
              </div>
              <div className="rounded-lg border border-neutral-800 p-3 text-center">
                <div className="text-xl font-semibold truncate">
                  {me?.user_id ? `${me.user_id.slice(0, 6)}…${me.user_id.slice(-4)}` : "—"}
                </div>
                <div className="mt-1 text-xs text-neutral-400">Card ID</div>
              </div>
              <div className="rounded-lg border border-neutral-800 p-3 text-center">
                <button
                  onClick={copyCardId}
                  className="rounded bg-neutral-800 px-3 py-1 text-sm hover:bg-neutral-700"
                  disabled={!me}
                >
                  {copyOk ? "Copied ✓" : "Copy ID"}
                </button>
                <div className="mt-1 text-xs text-neutral-400">For support & verification</div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
            <div className="font-medium">What next?</div>
            <p className="mt-1 text-sm text-neutral-300">{blurb}</p>

            <div className="mt-3 grid gap-2">
              <a
                href="/offers"
                onClick={() => track("welcome_cta_offers", { tier })}
                className="block rounded-lg bg-amber-400 text-black px-4 py-2 text-center font-medium hover:opacity-90"
              >
                Browse offers
              </a>

              {tier !== "access" ? (
                <a
                  href="/benefits"
                  onClick={() => track("welcome_cta_benefits", { tier })}
                  className="block rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-center hover:bg-neutral-800"
                >
                  See your benefits
                </a>
              ) : (
                <button
                  onClick={() => {
                    track("welcome_cta_join_member", { trial: TRIAL });
                    // Open unified modal with intent "member"
                    openJoin("member");
                  }}
                  className="block w-full rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-center hover:bg-neutral-800"
                >
                  {accessCta}
                </button>
              )}

              {tier !== "access" && (
                <a
                  href="/rewards"
                  onClick={() => track("welcome_cta_rewards", { tier })}
                  className="block rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-center hover:bg-neutral-800"
                >
                  Check rewards
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Soft reminder for ACCESS users */}
      {tier === "access" && (
        <div className="mt-6 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4">
          <div className="font-medium mb-1">Unlock more with membership</div>
          <p className="text-sm text-neutral-200">
            Upgrade to <span className="font-semibold">Member</span> for core protection and monthly
            rewards, or go <span className="font-semibold">Pro</span> for even more.
          </p>
          <button
            onClick={() => {
              track("welcome_cta_join_member_banner", { trial: TRIAL });
              openJoin("member");
            }}
            className="mt-3 inline-block rounded bg-amber-400 text-black px-4 py-2 font-medium"
          >
            {accessCta}
          </button>
        </div>
      )}
    </Container>
  );
}