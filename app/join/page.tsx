// app/join/page.tsx
"use client";

import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import { useJoinModal } from "@/components/JoinModalContext";

type Plan = "access" | "member" | "pro";

// Trial flags (match Account/Welcome usage)
const TRIAL_ACTIVE = process.env.NEXT_PUBLIC_TRIAL_ACTIVE === "true";
const TRIAL_COPY =
  process.env.NEXT_PUBLIC_TRIAL_COPY || "Try Member for £1 for 90 days";

export default function JoinPage() {
  const { openJoin } = useJoinModal();

  const handleJoin = (plan: Plan) => openJoin(plan);

  return (
    <Container>
      <PageHeader
        title="Join TradesCard"
        subtitle="Pick a plan and start saving. Switch or cancel any time."
        aside={
          <button
            onClick={() => handleJoin("member")}
            className="rounded bg-neutral-800 hover:bg-neutral-700 px-3 py-2"
          >
            Sign in / Join
          </button>
        }
      />

      {TRIAL_ACTIVE && (
        <div className="mb-4 rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-200">
          Limited-time offer: {TRIAL_COPY}
        </div>
      )}

      {/* Plans */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Member */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-semibold">Member</h4>
              <p className="mt-1 text-sm text-neutral-400">
                Core protection, monthly rewards entries, full offer access.
              </p>
            </div>
            <div className="text-right">
              {TRIAL_ACTIVE ? (
                <>
                  <div className="text-sm text-amber-300">£1 / 90 days</div>
                  <div className="text-[11px] text-neutral-500 line-through">£2.99 / mo</div>
                </>
              ) : (
                <span className="text-sm text-neutral-400">£2.99 / mo</span>
              )}
            </div>
          </div>

          <ul className="mt-3 space-y-1 text-sm text-neutral-300">
            <li>• Full offer access</li>
            <li>• Built-in benefits</li>
            <li>• Monthly prize entries</li>
            <li>• Digital card</li>
          </ul>

          <div className="mt-4">
            <button
              onClick={() => handleJoin("member")}
              className="inline-block rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm hover:bg-neutral-800"
            >
              {TRIAL_ACTIVE ? "Start Member for £1" : "Choose Member"}
            </button>
          </div>
        </div>

        {/* Pro */}
        <div className="relative rounded-2xl border border-amber-400/40 bg-amber-400/10 p-5 ring-1 ring-amber-400/30">
          <span className="absolute right-3 -top-2 rounded bg-neutral-800 text-[11px] px-2 py-0.5">
            Best value
          </span>

          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-semibold">Pro</h4>
              <p className="mt-1 text-sm text-neutral-200">
                Everything in Member plus early-access deals and Pro-only offers.
              </p>
            </div>
            <span className="text-sm text-amber-300">£7.99 / mo</span>
          </div>

          <ul className="mt-3 space-y-1 text-sm text-neutral-200">
            <li>• Everything in Member</li>
            <li>• Early-access deals</li>
            <li>• Pro-only offers</li>
            <li>• Highest rewards entries</li>
          </ul>

          <div className="mt-4">
            <button
              onClick={() => handleJoin("pro")}
              className="inline-block rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm hover:bg-neutral-800"
            >
              Choose Pro
            </button>
          </div>
        </div>
      </div>

      {/* Access (free) */}
      <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900/50 p-5">
        <div className="flex items-center gap-2">
          <h3 className="font-medium">Prefer to start free?</h3>
          <span className="rounded bg-neutral-800 px-2 py-0.5 text-xs">FREE</span>
        </div>
        <p className="text-sm text-neutral-400 mt-1">
          Join free, redeem public offers when signed in, and upgrade any time for benefits and
          rewards entries.
        </p>
        <div className="mt-3">
          <button
            onClick={() => handleJoin("access")}
            className="rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm hover:bg-neutral-800"
          >
            Join free
          </button>
        </div>
      </div>

      <p className="mt-6 text-[12px] text-neutral-500">
        No purchase necessary. A free postal entry route is available on public promo pages. Paid
        and free routes are treated equally in draws.
      </p>
    </Container>
  );
}