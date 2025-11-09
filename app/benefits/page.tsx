// app/benefits/page.tsx
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

export default function BenefitsPage() {
  // Auth / membership
  const me = useMe();
  const ready = useMeReady();
  const router = useRouter();

  const tier: Tier = (me?.tier as Tier) ?? "access";
  const isPaid =
    (tier === "member" || tier === "pro") &&
    (me?.status === "active" || me?.status === "trialing");
  const showTrial = shouldShowTrial(me);

  // Redirect paid users to their member experience
  useEffect(() => {
    if (ready && isPaid) router.replace("/member/benefits");
  }, [ready, isPaid, router]);

  if (ready && isPaid) {
    return (
      <Container>
        <PageHeader title="Benefits" subtitle="Taking you to your benefits…" />
      </Container>
    );
  }

  // Logged out / Access: promotional view
  return (
    <>
      {/* Mobile sticky CTA */}
      <div className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-neutral-800 bg-neutral-950/95 backdrop-blur supports-[backdrop-filter]:bg-neutral-950/70">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between gap-2">
          <div className="text-xs text-neutral-300">Unlock included benefits</div>
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
          title="Member Benefits"
          subtitle="Practical inclusions and exclusive pricing for paid members. Start with Member — upgrade to Pro any time."
          aside={
            showTrial ? (
              <span className="hidden sm:inline rounded bg-amber-400/20 text-amber-200 text-xs px-2 py-1 border border-amber-400/30">
                {TRIAL_COPY}
              </span>
            ) : undefined
          }
        />

        {/* How it works */}
        <section className="mb-5 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4">
          <ol className="list-decimal pl-5 text-sm text-neutral-300 space-y-1">
            <li>Join as <span className="text-neutral-100 font-medium">Member</span> or <span className="text-neutral-100 font-medium">Pro</span>.</li>
            <li>Access included benefits straight away in the app.</li>
            <li>Get exclusive member-only pricing with selected partners.</li>
            <li>Upgrade to Pro for early access and extra perks as they land.</li>
          </ol>
        </section>

        {/* Benefits grid (short, high-signal list) */}
        <section className="grid gap-3 md:grid-cols-3">
          <BenefitCard
            title="Protect Lite (included)"
            lines={[
              "Purchase protection on eligible redemptions",
              "Dispute help if things go wrong",
              "Simple claims via the app",
            ]}
            tag="Included with Member"
          />
          <BenefitCard
            title="Priority support"
            lines={[
              "Faster responses when you need us",
              "Email + in-app priority routing",
            ]}
            tag="Included with Member"
          />
          <BenefitCard
            title="Exclusive pricing"
            lines={[
              "Lower rates with selected partners",
              "Tools, fuel, food & business essentials",
              "New partners added regularly",
            ]}
            tag="Member & Pro pricing"
            accent
          />
        </section>

        {/* CTA strip */}
        <section className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-neutral-300">
            Ready to unlock benefits? Start with <span className="text-neutral-100">Member</span> or go <span className="text-neutral-100">Pro</span>.
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

        {/* FAQ */}
        <section className="mt-6">
          <h2 className="mb-3 text-base font-semibold">Frequently asked</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <Faq
              q="What’s the difference between Member and Pro?"
              a="Both unlock included benefits and member pricing. Pro gets you early access to new partner deals, Pro-only offers and occasional extra perks."
            />
            <Faq
              q="When do benefits become available?"
              a="Immediately after you join as a paid member. You can access your inclusions in the Benefits section of the app."
            />
            <Faq
              q="How does exclusive pricing work?"
              a="We agree member-only pricing with selected partners. When you’re signed in on a paid tier, you’ll see the unlocked rate and how to redeem it."
            />
            <Faq
              q="Can I cancel any time?"
              a="Yes. You can manage or cancel your plan in the app’s billing section. Access remains available on the free tier."
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

function BenefitCard({
  title,
  lines,
  tag,
  accent,
}: {
  title: string;
  lines: string[];
  tag?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-2xl border p-5 bg-neutral-900",
        accent ? "border-amber-400/30 ring-1 ring-amber-400/20" : "border-neutral-800",
      ].join(" ")}
    >
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-base font-semibold">{title}</h3>
        {tag && (
          <span className="rounded-full border border-neutral-700 bg-neutral-800/60 px-2 py-0.5 text-[11px] text-neutral-300">
            {tag}
          </span>
        )}
      </div>
      <ul className="mt-2 space-y-1 text-sm text-neutral-300">
        {lines.map((l) => (
          <li key={l}>• {l}</li>
        ))}
      </ul>
      <div className="mt-3 text-xs text-neutral-500">Paid members only</div>
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