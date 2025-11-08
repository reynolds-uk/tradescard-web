// app/welcome/page.tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import PrimaryButton from "@/components/PrimaryButton";
import { useMe } from "@/lib/useMe";
import { shouldShowTrial, TRIAL_COPY } from "@/lib/trial";
import { track } from "@/lib/track";

type Tier = "access" | "member" | "pro";

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
  const { user, tier, status } = useMe(); // { user?: { id, email }, tier, status }
  const [copyOk, setCopyOk] = useState(false);

  const showTrial = shouldShowTrial({ user, tier, status, ready: true } as any);
  const accessCta = showTrial ? TRIAL_COPY : "Become a Member (£2.99/mo)";

  const cardLabel = TIER_COPY[tier].label;
  const blurb = TIER_COPY[tier].blurb;

  // Preselect plan and route to /join (no modal)
  function startJoin(plan: "member" | "pro") {
    try {
      window.localStorage.setItem("join_wanted_plan", plan);
    } catch {}
    track("welcome_cta_join_member", { trial: showTrial, plan });
    window.location.href = "/join";
  }

  const copyCardId = async () => {
    if (!user?.id) return;
    try {
      await navigator.clipboard.writeText(user.id);
      setCopyOk(true);
      track("welcome_copy_card", { tier });
      setTimeout(() => setCopyOk(false), 1500);
    } catch {
      /* no-op */
    }
  };

  return (
    <Container>
      <PageHeader
        title="Welcome to TradesCard"
        subtitle="Here’s your card and the quickest next steps to start getting value."
        aside={
          showTrial ? (
            <span className="hidden sm:inline rounded bg-amber-400/20 text-amber-200 text-xs px-2 py-1 border border-amber-400/30">
              {TRIAL_COPY}
            </span>
          ) : undefined
        }
      />

      {showTrial && (
        <div className="mb-4 rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-200">
          Limited-time offer: {TRIAL_COPY}
        </div>
      )}

      {/* Card */}
      <section className="rounded-2xl border border-neutral-800 bg-gradient-to-br from-neutral-900 to-neutral-950 p-5">
        <div className="text-sm text-neutral-400">Your digital card</div>

        <div className="mt-2 grid gap-3 md:grid-cols-3">
          {/* Card & details */}
          <div className="md:col-span-2">
            <div className="text-2xl font-semibold">TradesCard</div>
            <div className="mt-1 text-sm text-neutral-300">
              {user?.email ?? "—"}
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="rounded-lg border border-neutral-800 p-3 text-center">
                <div className="text-xl font-semibold">{cardLabel}</div>
                <div className="mt-1 text-xs text-neutral-400">Tier</div>
              </div>

              <div className="rounded-lg border border-neutral-800 p-3 text-center">
                <div className="text-xl font-semibold truncate">
                  {user?.id ? `${user.id.slice(0, 6)}…${user.id.slice(-4)}` : "—"}
                </div>
                <div className="mt-1 text-xs text-neutral-400">Card ID</div>
              </div>

              <div className="rounded-lg border border-neutral-800 p-3 text-center">
                <button
                  onClick={copyCardId}
                  className="rounded bg-neutral-800 px-3 py-1 text-sm hover:bg-neutral-700 disabled:opacity-50"
                  disabled={!user?.id}
                >
                  {copyOk ? "Copied ✓" : "Copy ID"}
                </button>
                <div className="mt-1 text-xs text-neutral-400">
                  For support & verification
                </div>
              </div>
            </div>
          </div>

          {/* Next steps */}
          <aside className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
            <div className="font-medium">What next?</div>
            <p className="mt-1 text-sm text-neutral-300">{blurb}</p>

            <div className="mt-3 grid gap-2">
              <Link
                href="/offers"
                onClick={() => track("welcome_cta_offers", { tier })}
                className="block"
              >
                <PrimaryButton className="w-full">Browse offers</PrimaryButton>
              </Link>

              {tier !== "access" ? (
                <>
                  <Link
                    href="/benefits"
                    onClick={() => track("welcome_cta_benefits", { tier })}
                    className="block"
                  >
                    <button className="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-2 font-medium hover:bg-neutral-800">
                      See your benefits
                    </button>
                  </Link>

                  <Link
                    href="/rewards"
                    onClick={() => track("welcome_cta_rewards", { tier })}
                    className="block"
                  >
                    <button className="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-2 font-medium hover:bg-neutral-800">
                      Check rewards
                    </button>
                  </Link>
                </>
              ) : (
                <>
                  <PrimaryButton
                    onClick={() => startJoin("member")}
                    className="w-full"
                  >
                    {accessCta}
                  </PrimaryButton>
                  <button
                    onClick={() => startJoin("pro")}
                    className="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-2 font-medium hover:bg-neutral-800"
                  >
                    Choose Pro (£7.99/mo)
                  </button>
                </>
              )}
            </div>
          </aside>
        </div>
      </section>

      {/* Upsell only for ACCESS (or logged out) */}
      {tier === "access" && (
        <section className="mt-6 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4">
          <div className="font-medium mb-1">Unlock more with membership</div>
          <p className="text-sm text-neutral-200">
            Upgrade to <span className="font-semibold">Member</span> for core protection and
            monthly rewards, or go <span className="font-semibold">Pro</span> for even more.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <PrimaryButton onClick={() => startJoin("member")}>
              {accessCta}
            </PrimaryButton>
            <button
              onClick={() => startJoin("pro")}
              className="rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-2 font-medium hover:bg-neutral-800"
            >
              Choose Pro
            </button>
          </div>
        </section>
      )}
    </Container>
  );
}