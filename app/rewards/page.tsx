// app/rewards/page.tsx
"use client";

import { useEffect } from "react";
import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import PrimaryButton from "@/components/PrimaryButton";
import { useRouter } from "next/navigation";
import { useMe } from "@/lib/useMe";
import { useMeReady } from "@/lib/useMeReady";
import { routeToJoin } from "@/lib/routeToJoin";
import { shouldShowTrial, TRIAL_COPY } from "@/lib/trial";

type Tier = "access" | "member" | "pro";

export default function RewardsPage() {
  const me = useMe();
  const ready = useMeReady();
  const router = useRouter();

  const tier: Tier = (me?.tier as Tier) ?? "access";
  const isPaid =
    (tier === "member" || tier === "pro") &&
    (me?.status === "active" || me?.status === "trialing");
  const showTrial = shouldShowTrial(me);

  // Paid users go to the member experience
  useEffect(() => {
    if (ready && isPaid) router.replace("/member/rewards");
  }, [ready, isPaid, router]);

  if (ready && isPaid) {
    return (
      <Container>
        <PageHeader title="Rewards" subtitle="Taking you to your rewards…" />
      </Container>
    );
  }

  // Logged-out / Access promotional view
  return (
    <>
      {/* Mobile sticky CTA */}
      <div className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-neutral-800 bg-neutral-950/95 backdrop-blur supports-[backdrop-filter]:bg-neutral-950/70">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between gap-2">
          <div className="text-xs text-neutral-300">Earn entries each month</div>
          <PrimaryButton
            onClick={() => routeToJoin("member")}
            className="text-xs px-3 py-1.5"
          >
            {showTrial ? TRIAL_COPY : "Become a Member"}
          </PrimaryButton>
        </div>
      </div>

      <Container className="pb-20 md:pb-10">
        <PageHeader
          title="Rewards"
          subtitle="Member-only prize draws and loyalty touches. Join as a paid member to start earning monthly entries — upgrade to Pro for occasional boosts and early drops."
          aside={
            showTrial ? (
              <span className="hidden sm:inline rounded bg-amber-400/20 text-amber-200 text-xs px-2 py-1 border border-amber-400/30">
                {TRIAL_COPY}
              </span>
            ) : undefined
          }
        />

        {/* How it works – simple, transparent rules */}
        <section className="mb-5 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4">
          <ul className="list-disc pl-5 text-sm text-neutral-300 space-y-1">
            <li>Join as <span className="text-neutral-100 font-medium">Member</span> or <span className="text-neutral-100 font-medium">Pro</span> to start earning entries.</li>
            <li>Entries accrue monthly from your membership activity and promos.</li>
            <li>Pro gets occasional entry boosts and early access to selected drops.</li>
            <li>No purchase necessary — free alternative entry route on each promo page.</li>
          </ul>
        </section>

        {/* Current & upcoming promos (placeholder tiles – CMS/DB later) */}
        <section className="grid gap-3 md:grid-cols-3">
          <RewardTile
            tag="This month"
            title="Tool bundle worth £500"
            copy="Member draw. One winner. Free entry route available."
            cta="Become a Member"
            onCta={() => routeToJoin("member")}
          />
          <RewardTile
            tag="Spot prize"
            title="£50 fuel card"
            copy="Weekly spot prize. Pro gets boosted entries this month."
            cta={showTrial ? TRIAL_COPY : "Go Pro"}
            onCta={() => routeToJoin("pro")}
            accent
          />
          <RewardTile
            tag="Coming soon"
            title="Trade night tickets"
            copy="Limited allocation for members. First access will go to Pro."
            cta="Join to get updates"
            onCta={() => routeToJoin("member")}
          />
        </section>

        {/* CTA strip */}
        <section className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-neutral-300">
            Ready to start earning entries? Join as <span className="text-neutral-100">Member</span> or go <span className="text-neutral-100">Pro</span>.
          </div>
          <div className="flex gap-2">
            <PrimaryButton onClick={() => routeToJoin("member")}>
              {showTrial ? TRIAL_COPY : "Become a Member"}
            </PrimaryButton>
            <button
              onClick={() => routeToJoin("pro")}
              className="rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm hover:bg-neutral-800"
            >
              Go Pro
            </button>
          </div>
        </section>

        {/* Transparency note */}
        <section className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4">
          <p className="text-xs text-neutral-400">
            Each promotion has published terms, eligibility and a free entry route. Winners are selected at random and contacted by email. We’ll announce winners (first name, town) on the promo page once confirmed.
          </p>
        </section>

        {/* FAQ */}
        <section className="mt-6">
          <h2 className="mb-3 text-base font-semibold">Frequently asked</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <Faq
              q="Do I need to buy anything to enter?"
              a="No. Every promo has a free alternative entry route alongside member entries."
            />
            <Faq
              q="How do I earn entries?"
              a="Entries are granted each month for active paid members and via occasional promotions. The details and caps are shown on each promo."
            />
            <Faq
              q="What’s different with Pro?"
              a="Pro receives occasional entry boosts and earlier access to limited promotions. Member gets standard entries."
            />
            <Faq
              q="How are winners selected?"
              a="Randomly, in line with the promo terms. We contact winners by email and publish a confirmation on the promo page."
            />
          </div>
        </section>
      </Container>
    </>
  );
}

/* ---------------------------------- */
/* Small components                    */
/* ---------------------------------- */

function RewardTile({
  tag,
  title,
  copy,
  cta,
  onCta,
  accent,
}: {
  tag: string;
  title: string;
  copy: string;
  cta: string;
  onCta: () => void;
  accent?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-2xl border p-5 bg-neutral-900 flex flex-col gap-3",
        accent ? "border-amber-400/30 ring-1 ring-amber-400/20" : "border-neutral-800",
      ].join(" ")}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">{title}</h3>
        <span className="rounded-full border border-neutral-700 bg-neutral-800/60 px-2 py-0.5 text-[11px] text-neutral-300">
          {tag}
        </span>
      </div>
      <p className="text-sm text-neutral-300">{copy}</p>
      <div className="mt-auto">
        {accent ? (
          <PrimaryButton onClick={onCta}>{cta}</PrimaryButton>
        ) : (
          <button
            onClick={onCta}
            className="rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm hover:bg-neutral-800"
          >
            {cta}
          </button>
        )}
      </div>
    </div>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <details className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
      <summary className="cursor-pointer select-none text-sm font-medium text-neutral-100">
        {q}
      </summary>
      <p className="mt-2 text-sm text-neutral-300">{a}</p>
    </details>
  );
}