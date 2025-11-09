// app/rewards/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import PrimaryButton from "@/components/PrimaryButton";
import { useMe } from "@/lib/useMe";
import { useMeReady } from "@/lib/useMeReady";
import { routeToJoin } from "@/lib/routeToJoin";
import { shouldShowTrial, TRIAL_COPY } from "@/lib/trial";

type Tier = "access" | "member" | "pro";

export default function RewardsPage() {
  const me = useMe();
  const ready = useMeReady();

  const tier: Tier = (me?.tier as Tier) ?? "access";
  const isPaid =
    (tier === "member" || tier === "pro") &&
    (me?.status === "active" || me?.status === "trialing");

  const showTrial = shouldShowTrial(me);

  // Paid users go to the member view (no public promo flicker)
  useEffect(() => {
    if (!ready || !isPaid) return;
    window.location.replace("/member/rewards");
  }, [ready, isPaid]);

  const subtitle = useMemo(() => {
    if (!ready) return "Loading…";
    return "Earn reward points on Member or Pro. Points convert to entries for our prize draws — plus a free postal route is always available.";
  }, [ready]);

  // Postal modal
  const [openPostal, setOpenPostal] = useState(false);

  // Competition fixtures (placeholder dates; wire to DB later)
  const now = new Date();
  const currentCloses = new Date(now.getFullYear(), now.getMonth() + 1, 1); // next month start
  const lifetimeCloses = new Date(now.getFullYear(), 11, 31); // end of year (example)

  return (
    <Container>
      <PageHeader
        title="Rewards"
        subtitle={subtitle}
        aside={
          !isPaid && showTrial ? (
            <span className="hidden sm:inline rounded bg-amber-400/20 text-amber-200 text-xs px-2 py-1 border border-amber-400/30">
              {TRIAL_COPY}
            </span>
          ) : undefined
        }
      />

      {/* Progress & explainer */}
      <ProgressStrip />

      {/* Draws */}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <CompCard
          tone="primary"
          title="Current Prize"
          kicker="Time-bound draw"
          headline="Win a £1,000 Trade Bundle"
          copy="Tools, fuel and food credits to keep your month moving."
          closes={currentCloses}
          bullets={[
            "Entries earned each month from your points",
            "Member: 1.25× boost • Pro: 1.5× boost",
            "No purchase necessary (postal route available)",
          ]}
          ctaLabel={showTrial ? TRIAL_COPY : "Become a Member"}
          onJoin={() => routeToJoin("member")}
          onPostal={() => setOpenPostal(true)}
        />

        <CompCard
          tone="amber"
          title="Lifetime Points Prize"
          kicker="Ongoing draw"
          headline="Win a Weekend Away"
          copy="Every lifetime point you earn is an entry. Active members can win."
          closes={lifetimeCloses}
          bullets={[
            "Entries accumulate over time from lifetime points",
            "Pro keeps the 1.5× boost on all points earned",
            "Postal route available for each draw period",
          ]}
          ctaLabel={showTrial ? TRIAL_COPY : "Go Pro for Boosted Entries"}
          onJoin={() => routeToJoin("pro")}
          onPostal={() => setOpenPostal(true)}
        />
      </div>

      {/* Plan nudges */}
      <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900/70 p-4">
        <div className="grid items-center gap-3 md:grid-cols-[1fr_auto_auto]">
          <div className="text-sm text-neutral-300">
            Join today — points convert to entries automatically. Cancel any time.
          </div>
          <button
            onClick={() => routeToJoin("member")}
            className="rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm hover:bg-neutral-800"
          >
            Join Member
          </button>
          <PrimaryButton onClick={() => routeToJoin("pro")} className="text-sm">
            Go Pro
          </PrimaryButton>
        </div>
      </div>

      {/* Tier ladder (Booking.com "levels" inspired, adapted for TradeCard) */}
      <Ladder />

      {/* FAQs */}
      <FaqBlock setOpenPostal={setOpenPostal} />

      {/* Postal entry modal */}
      {openPostal && <PostalModal onClose={() => setOpenPostal(false)} showTrial={showTrial} />}
    </Container>
  );
}

/* =============================== components =============================== */

function ProgressStrip() {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <div className="text-sm font-semibold">How rewards work</div>
          <p className="mt-1 text-sm text-neutral-300">
            Earn <strong>monthly points</strong> from your plan and activity (e.g. redemptions, referrals).
            Points convert to entries for prize draws. You also build <strong>lifetime points</strong> —
            those count towards the ongoing Lifetime Prize.
          </p>
        </div>
        {/* Placeholder “progress” visuals (wired later) */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3">
            <div className="text-xs text-neutral-400">This month</div>
            <div className="mt-1 text-2xl font-semibold">—</div>
            <div className="text-xs text-neutral-500">Points (convert to entries)</div>
          </div>
          <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3">
            <div className="text-xs text-neutral-400">Lifetime</div>
            <div className="mt-1 text-2xl font-semibold">—</div>
            <div className="text-xs text-neutral-500">Points (ongoing entries)</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CompCard(props: {
  tone?: "primary" | "amber";
  title: string;
  kicker: string;
  headline: string;
  copy: string;
  bullets: string[];
  closes: Date;
  ctaLabel: string;
  onJoin: () => void;
  onPostal: () => void;
}) {
  const {
    tone = "primary",
    title,
    kicker,
    headline,
    copy,
    bullets,
    closes,
    ctaLabel,
    onJoin,
    onPostal,
  } = props;

  const border =
    tone === "amber"
      ? "border-amber-400/30 ring-1 ring-amber-400/15"
      : "border-neutral-800";

  const dateStr = closes.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });

  return (
    <div className={`rounded-2xl ${border} bg-neutral-900 p-4`}>
      <div className="mb-1 flex items-center justify-between">
        <div className="text-sm text-neutral-300">{title}</div>
        <span className="rounded-full border border-neutral-700 px-2 py-0.5 text-[11px] text-neutral-300">
          {kicker}
        </span>
      </div>
      <div className="text-lg font-semibold leading-snug">{headline}</div>
      <p className="mt-1 text-sm text-neutral-300">{copy}</p>

      <ul className="mt-3 space-y-1 text-sm text-neutral-300">
        {bullets.map((b) => (
          <li key={b}>• {b}</li>
        ))}
      </ul>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <PrimaryButton onClick={onJoin}>{ctaLabel}</PrimaryButton>
        <button
          onClick={onPostal}
          className="rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm hover:bg-neutral-800"
        >
          Postal entry (free)
        </button>
      </div>

      <div className="mt-2 text-xs text-neutral-500">Closes: {dateStr}</div>
    </div>
  );
}

function Ladder() {
  return (
    <div className="mt-6">
      <h2 className="mb-3 text-lg font-semibold">Membership & boosts</h2>
      <div className="grid gap-3 md:grid-cols-3">
        <LadderCard
          level="Access"
          badge="Free"
          points="—"
          perks={["Redeem public offers", "No entries (upgrade to earn)"]}
        />
        <LadderCard
          level="Member"
          badge="Most popular"
          points="1.25×"
          perks={[
            "Monthly points → entries",
            "Lifetime points accumulate",
            "Referral & redemption boosts",
          ]}
        />
        <LadderCard
          level="Pro"
          badge="Best value"
          points="1.5×"
          perks={[
            "Bigger monthly points → entries",
            "Priority on Pro-only boosts",
            "Long-tenure multipliers (e.g. 12+ months)",
          ]}
          accent
        />
      </div>
    </div>
  );
}

function LadderCard({
  level,
  badge,
  points,
  perks,
  accent,
}: {
  level: string;
  badge?: string;
  points: string;
  perks: string[];
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border ${
        accent ? "border-amber-400/30 ring-1 ring-amber-400/15" : "border-neutral-800"
      } bg-neutral-900 p-4`}
    >
      <div className="mb-1 flex items-center justify-between">
        <div className="text-sm text-neutral-300">{level}</div>
        {badge && (
          <span className="rounded-full border border-neutral-700 px-2 py-0.5 text-[11px] text-neutral-300">
            {badge}
          </span>
        )}
      </div>
      <div className="text-lg font-semibold">{points} points boost</div>
      <ul className="mt-2 space-y-1 text-sm text-neutral-300">
        {perks.map((p) => (
          <li key={p}>• {p}</li>
        ))}
      </ul>
    </div>
  );
}

function FaqBlock({ setOpenPostal }: { setOpenPostal: (b: boolean) => void }) {
  return (
    <div className="mt-8">
      <h2 className="mb-3 text-lg font-semibold">FAQs</h2>
      <div className="divide-y divide-neutral-800 rounded-2xl border border-neutral-800">
        <Faq
          q="How do I get entries?"
          a="Points earned each month convert to entries for the current prize. Your lifetime points also act as ongoing entries for the Lifetime Prize."
        />
        <Faq
          q="Do I need to buy anything to enter?"
          a={
            <>
              No. Every draw includes a free postal entry route.{" "}
              <button
                onClick={() => setOpenPostal(true)}
                className="underline decoration-neutral-500 underline-offset-2 hover:text-white"
              >
                See postal entry
              </button>
              .
            </>
          }
        />
        <Faq
          q="What boosts my points?"
          a="Your plan (Member 1.25×, Pro 1.5×), activity such as offer redemptions/referrals, and long-tenure bonuses (e.g. 12+ months on Pro)."
        />
        <Faq
          q="Can I cancel?"
          a="Yes — cancel any time from Manage billing. Points already earned still count for the relevant draw period."
        />
      </div>
    </div>
  );
}

function Faq({ q, a }: { q: string; a: React.ReactNode }) {
  return (
    <details className="group">
      <summary className="cursor-pointer list-none px-4 py-3 text-sm">
        <span className="mr-2 inline-block rounded bg-neutral-800 px-1.5 py-0.5 text-[10px] text-neutral-300">
          Q
        </span>
        <span className="align-middle">{q}</span>
        <span className="float-right text-neutral-500 group-open:hidden">+</span>
        <span className="float-right hidden text-neutral-500 group-open:inline">–</span>
      </summary>
      <div className="px-4 pb-4 text-sm text-neutral-300">{a}</div>
    </details>
  );
}

function PostalModal({ onClose, showTrial }: { onClose: () => void; showTrial: boolean }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full sm:w-[520px] rounded-t-2xl sm:rounded-2xl border border-neutral-800 bg-neutral-950 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex items-center justify-between">
          <div className="text-base font-semibold">Postal entry (free route)</div>
          <button
            onClick={onClose}
            className="rounded px-2 py-1 text-sm text-neutral-300 hover:bg-neutral-800"
            aria-label="Close"
          >
            Close
          </button>
        </div>
        <p className="text-sm text-neutral-300">
          You can enter any TradeCard prize draw without purchase by post. Maximum one entry per
          postcard for each draw period. Write clearly:
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-300">
          <li>Full name and postal address (no PO Boxes)</li>
          <li>Email address and phone number (optional)</li>
          <li>The specific TradeCard prize draw you wish to enter</li>
        </ul>
        <p className="mt-2 text-sm text-neutral-400">
          Send to: <span className="text-neutral-200">TradeCard Prize Draws, PO Box 12345, London, EC1A 1AA</span>.
          By entering, you accept the draw Terms and Rules published on this site.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            onClick={onClose}
            className="rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm hover:bg-neutral-800"
          >
            Done
          </button>
          <PrimaryButton onClick={() => routeToJoin("member")} className="text-sm">
            {showTrial ? TRIAL_COPY : "Start membership"}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}