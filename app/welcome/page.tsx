// app/welcome/page.tsx
"use client";

import { useMemo, useState } from "react";
import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import { useJoinModal } from "@/components/JoinModalContext";
import { useMe } from "@/lib/useMe"; // <-- centralised auth/tier state
import { track } from "@/lib/track";

type Tier = "access" | "member" | "pro";

// Trial flags (kept in sync with Account page)
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
  const { openJoin } = useJoinModal();
  const { user, tier, status } = useMe(); // { user?: { id, email }, tier: Tier, status: string }
  const [copyOk, setCopyOk] = useState(false);

  const cardLabel = TIER_COPY[tier].label;
  const blurb = TIER_COPY[tier].blurb;

  // Only show trial chips to users who are NOT already Member/Pro & active
  const showTrial = useMemo(() => {
    if (!TRIAL) return false;
    // show when logged out or effectively on ACCESS/canceled/free
    if (!user) return true;
    return tier === "access" || status === "canceled" || status === "free";
  }, [user, tier, status]);

  const accessCta = showTrial ? TRIAL_COPY : "Become a Member (£2.99/mo)";

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
      />

      {showTrial && (
        <div className="mb-4 rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-200">
          Limited-time offer: {TRIAL_COPY}
        </div>
      )}

      {/* Card */}
      <div className="rounded-2xl border border-neutral-800 bg-gradient-to-br from-neutral-900 to-neutral-950 p-5">
        <div className="text-sm text-neutral-400">Your digital card</div>
        <div className="mt-2 grid gap-3 md:grid-cols-3">
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
                  className="rounded bg-neutral-800 px-3 py-1 text-sm hover:bg-neutral-700"
                  disabled={!user?.id}
                >
                  {copyOk ? "Copied ✓" : "Copy ID"}
                </button>
                <div className="mt-1 text-xs text-neutral-400">For support & verification</div>
              </div>
            </div>
          </div>

          {/* Next steps */}
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
                <>
                  <a
                    href="/benefits"
                    onClick={() => track("welcome_cta_benefits", { tier })}
                    className="block rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-center hover:bg-neutral-800"
                  >
                    See your benefits
                  </a>
                  <a
                    href="/rewards"
                    onClick={() => track("welcome_cta_rewards", { tier })}
                    className="block rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-center hover:bg-neutral-800"
                  >
                    Check rewards
                  </a>
                </>
              ) : (
                <button
                  onClick={() => {
                    track("welcome_cta_join_member", { trial: showTrial });
                    openJoin("member");
                  }}
                  className="block w-full rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-center hover:bg-neutral-800"
                >
                  {accessCta}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Access upsell only for ACCESS (or logged out) */}
      {tier === "access" && (
        <div className="mt-6 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4">
          <div className="font-medium mb-1">Unlock more with membership</div>
          <p className="text-sm text-neutral-200">
            Upgrade to <span className="font-semibold">Member</span> for core protection and
            monthly rewards, or go <span className="font-semibold">Pro</span> for even more.
          </p>
          <button
            onClick={() => {
              track("welcome_cta_join_member_banner", { trial: showTrial });
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