"use client";

import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import { useJoinModal } from "@/components/JoinModalContext";
import { useMe } from "@/lib/useMe";
import { useJoinActions } from "@/components/useJoinActions";
import { shouldShowTrial, TRIAL_COPY } from "@/lib/trial";

type Plan = "access" | "member" | "pro";

export default function JoinPage() {
  const { open: openJoin } = useJoinModal();
  const me = useMe();
  const next = "/welcome";
  const { busy, error, startMembership, joinFree } = useJoinActions(next);

  const startPlan = (plan: Exclude<Plan, "access">) => {
    if (!me.user) {
      openJoin(plan);
      return;
    }
    startMembership(plan);
  };

  return (
    <Container>
      <PageHeader
        title="Join TradesCard"
        subtitle="Pick a plan and start saving. Switch or cancel any time."
        aside={
          !me.user ? (
            <button onClick={() => openJoin("member")} className="rounded bg-neutral-800 hover:bg-neutral-700 px-3 py-2">
              Sign in / Join
            </button>
          ) : (
            <span className="text-xs text-neutral-400">Signed in as {me.email}</span>
          )
        }
      />

      {shouldShowTrial(me) && (
        <div className="mb-4 rounded border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-amber-200 text-sm">
          Limited-time offer: {TRIAL_COPY}
        </div>
      )}

      {/* plans */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Member</h4>
            <span className="text-sm text-neutral-400">{shouldShowTrial(me) ? "£1 / 90 days" : "£2.99/mo"}</span>
          </div>
          <ul className="mt-3 space-y-1 text-sm text-neutral-300">
            <li>• Full offer access</li>
            <li>• Built-in benefits</li>
            <li>• Monthly prize entry</li>
            <li>• Digital card</li>
          </ul>
          <div className="mt-4">
            <button
              onClick={() => startPlan("member")}
              disabled={busy}
              className="inline-block rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm hover:bg-neutral-800 disabled:opacity-60"
            >
              {busy ? "Opening…" : shouldShowTrial(me) ? "Start Member for £1" : "Choose Member"}
            </button>
          </div>
        </div>

        <div className="relative rounded-2xl border border-amber-400/40 bg-amber-400/10 p-5 ring-1 ring-amber-400/30">
          <span className="absolute right-3 -top-2 rounded bg-neutral-800 text-[11px] px-2 py-0.5">Best value</span>
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Pro</h4>
            <span className="text-sm text-amber-300">£7.99/mo</span>
          </div>
          <ul className="mt-3 space-y-1 text-sm text-neutral-200">
            <li>• Everything in Member</li>
            <li>• Early-access deals & Pro-only offers</li>
            <li>• Double prize entries</li>
          </ul>
          <div className="mt-4">
            <button
              onClick={() => startPlan("pro")}
              disabled={busy}
              className="inline-block rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm hover:bg-neutral-800 disabled:opacity-60"
            >
              {busy ? "Opening…" : "Choose Pro"}
            </button>
          </div>
        </div>
      </div>

      {/* Access/free */}
      <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900/50 p-5">
        <div className="flex items-center gap-2">
          <h3 className="font-medium">Prefer to start free?</h3>
          <span className="rounded bg-neutral-800 px-2 py-0.5 text-xs">FREE</span>
        </div>
        <p className="text-sm text-neutral-400 mt-1">
          Join free, redeem public offers when signed in, and upgrade any time for benefits and rewards entries.
        </p>
        <div className="mt-3">
          <button
            onClick={() => (me.user ? joinFree() : openJoin("access"))}
            className="rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm hover:bg-neutral-800"
          >
            {me.user ? "Continue free" : "Join free"}
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-4 text-sm text-red-300">
          {error}
        </p>
      )}

      <p className="mt-6 text-[12px] text-neutral-500">
        No purchase necessary. A free postal entry route is available on public promo pages. Paid and free routes are treated equally in draws.
      </p>
    </Container>
  );
}