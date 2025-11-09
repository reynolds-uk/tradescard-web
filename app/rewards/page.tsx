// app/rewards/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import PrimaryButton from "@/components/PrimaryButton";
import { routeToJoin } from "@/lib/routeToJoin";
import { useMe } from "@/lib/useMe";
import { useMeReady } from "@/lib/useMeReady";
import { shouldShowTrial, TRIAL_COPY } from "@/lib/trial";

type Tier = "access" | "member" | "pro";

/* ----------------------------------------------------------------------------
   Placeholder data (wire to DB later)
---------------------------------------------------------------------------- */
type Competition = {
  slug: string;
  tag: "Current" | "Featured" | "Lifetime";
  title: string;
  copy: string;
  prizeLine?: string;
  starts: string; // ISO
  ends: string;   // ISO
  freeRouteUrl?: string;
  highlight?: boolean; // style accent
};

const COMPETITIONS: Competition[] = [
  {
    slug: "tool-bundle-500",
    tag: "Featured",
    title: "Trade tool bundle worth £500",
    prizeLine: "One winner • RRP ~£500",
    copy:
      "Our featured time-boxed draw. Active Members and Pro are auto-entered based on their monthly allocation. Free postal route available.",
    starts: "2025-11-01",
    ends: "2025-11-30",
    freeRouteUrl: "/promos/tool-bundle-500",
    highlight: true,
  },
  {
    slug: "lifetime-tier-points",
    tag: "Lifetime",
    title: "Lifetime Tier Points Draw",
    prizeLine: "Points-weighted draw • 1 winner",
    copy:
      "Entries are weighted by your lifetime Tier Points. You must be an active Member or Pro at the time of the draw to claim. Free postal route available.",
    starts: "2025-11-01",
    ends: "2025-11-30",
    freeRouteUrl: "/promos/lifetime-tier-points",
  },
];

/* Small helpers */
function niceDate(iso: string) {
  try {
    return new Date(iso + "T00:00:00").toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function RewardsPage() {
  const me = useMe();
  const ready = useMeReady();
  const router = useRouter();

  const tier: Tier = (me?.tier as Tier) ?? "access";
  const isPaid =
    (tier === "member" || tier === "pro") &&
    (me?.status === "active" || me?.status === "trialing");

  const showTrial = shouldShowTrial(me);

  // Paid users go to member view
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

  return (
    <>
      {/* Mobile sticky CTA */}
      <div className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-neutral-800 bg-neutral-950/95 backdrop-blur supports-[backdrop-filter]:bg-neutral-950/70">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between gap-2">
          <div className="text-xs text-neutral-300">Start earning entries</div>
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
          subtitle="Two live competitions. Join as a paid member to earn entries automatically, or use the free postal route on each promo page."
          aside={
            showTrial ? (
              <span className="hidden sm:inline rounded bg-amber-400/20 text-amber-200 text-xs px-2 py-1 border border-amber-400/30">
                {TRIAL_COPY}
              </span>
            ) : undefined
          }
        />

        {/* Current competitions */}
        <section className="mb-5">
          <h2 className="mb-3 text-base font-semibold">Current competitions</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {COMPETITIONS.map((c) => (
              <CompetitionCard
                key={c.slug}
                c={c}
                onMember={() => routeToJoin("member")}
                onPro={() => routeToJoin("pro")}
                trialCopy={showTrial ? TRIAL_COPY : undefined}
              />
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4">
          <h3 className="mb-2 text-sm font-semibold">How it works</h3>
          <ol className="list-decimal pl-5 text-sm text-neutral-300 space-y-1">
            <li>Join as <span className="text-neutral-100 font-medium">Member</span> or <span className="text-neutral-100 font-medium">Pro</span>.</li>
            <li>While active, you automatically receive entries for current competitions.</li>
            <li>Pro may receive boosted allocations and early access on selected draws.</li>
            <li>Prefer not to join? Each promo page explains the free postal entry route.</li>
          </ol>
        </section>

        {/* CTA strip */}
        <section className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-neutral-300">
            Ready to enter? Become a <span className="text-neutral-100">Member</span> or go <span className="text-neutral-100">Pro</span>.
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

        {/* Transparency / compliance */}
        <section className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4">
          <p className="text-xs text-neutral-400">
            Each competition has published terms, eligibility and a free entry route.
            Winners are selected at random and contacted by email. You must be an active
            paid member at the time of the draw to claim a member-awarded prize. We
            publish winner confirmations (first name, town) on the promo page once verified.
          </p>
        </section>

        {/* FAQ */}
        <section className="mt-6">
          <h2 className="mb-3 text-base font-semibold">FAQs</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <Faq
              q="Do I have to be a paying member to enter?"
              a="No. Every competition has a free postal route. However, member entries are automatic while your membership is active."
            />
            <Faq
              q="What is the Lifetime Tier Points draw?"
              a="It’s a competition where entries are weighted by your lifetime Tier Points. You must be an active member at the time of the draw to claim a prize."
            />
            <Faq
              q="How are winners selected?"
              a="Randomly, in line with the published terms for each competition. We contact winners by email and publish a confirmation on the promo page."
            />
            <Faq
              q="What’s different with Pro?"
              a="Pro may receive occasional entry boosts and earlier access to selected draws. Details are always listed on each promo page."
            />
          </div>
        </section>
      </Container>
    </>
  );
}

/* ----------------------------------------------------------------------------
   Components (kept local to avoid extra files)
---------------------------------------------------------------------------- */
function CompetitionCard({
  c,
  onMember,
  onPro,
  trialCopy,
}: {
  c: {
    slug: string;
    tag: "Current" | "Featured" | "Lifetime";
    title: string;
    copy: string;
    prizeLine?: string;
    starts: string;
    ends: string;
    freeRouteUrl?: string;
    highlight?: boolean;
  };
  onMember: () => void;
  onPro: () => void;
  trialCopy?: string;
}) {
  const accent =
    c.highlight || c.tag === "Featured" ? "border-amber-400/30 ring-1 ring-amber-400/20" : "border-neutral-800";

  return (
    <div className={`rounded-2xl border bg-neutral-900 p-5 flex flex-col gap-3 ${accent}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">{c.title}</h3>
        <span className="rounded-full border border-neutral-700 bg-neutral-800/60 px-2 py-0.5 text-[11px] text-neutral-300">
          {c.tag}
        </span>
      </div>
      {c.prizeLine && <div className="text-sm text-neutral-300">{c.prizeLine}</div>}
      <p className="text-sm text-neutral-300">{c.copy}</p>
      <div className="text-xs text-neutral-400">
        Opens <span className="text-neutral-200">{niceDate(c.starts)}</span> ·
        Closes <span className="text-neutral-200">{niceDate(c.ends)}</span>
      </div>

      <div className="mt-1 flex flex-wrap gap-2">
        <PrimaryButton onClick={onMember}>
          {trialCopy ? trialCopy : "Become a Member"}
        </PrimaryButton>
        <button
          onClick={onPro}
          className="rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm hover:bg-neutral-800"
        >
          Go Pro
        </button>
        {c.freeRouteUrl && (
          <a
            href={c.freeRouteUrl}
            className="text-sm text-neutral-300 underline underline-offset-4 hover:text-white"
          >
            Free postal entry route
          </a>
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