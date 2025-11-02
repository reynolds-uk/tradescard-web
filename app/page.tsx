// app/page.tsx
import Link from "next/link";
import Image from "next/image";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Sticky mobile CTA */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-zinc-900/95 backdrop-blur supports-[backdrop-filter]:bg-zinc-900/75 border-t border-zinc-800">
        <div className="mx-auto max-w-screen-sm px-4 py-3 flex items-center gap-3">
          <span className="text-sm text-zinc-300">TradesCard</span>
          <div className="ms-auto flex gap-2">
            <Link
              href="/join"
              className="inline-flex items-center justify-center rounded-lg bg-amber-400 px-4 py-2 text-zinc-900 font-semibold hover:bg-amber-300"
            >
              Join free
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center rounded-lg bg-zinc-800 px-4 py-2 text-zinc-100 hover:bg-zinc-700"
            >
              Go Pro
            </Link>
          </div>
        </div>
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 pt-12 pb-20 md:pt-20 md:pb-28">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs text-zinc-300">
                The card built for the people who build Britain
              </p>
              <h1 className="text-4xl/tight md:text-5xl/tight font-extrabold tracking-tight">
                Save. Get protected. Win something worth having.
              </h1>
              <p className="mt-4 text-zinc-300">
                TradesCard gives UK tradespeople real savings, built-in support, and
                monthly rewards — all in one simple digital membership.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/join"
                  className="inline-flex items-center justify-center rounded-xl bg-amber-400 px-5 py-3 text-zinc-900 font-semibold hover:bg-amber-300"
                >
                  Join free
                </Link>
                <Link
                  href="/offers"
                  className="inline-flex items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-3 hover:bg-zinc-800"
                >
                  Browse offers
                </Link>
              </div>
              <p className="mt-3 text-xs text-zinc-400">
                Free Access tier. Upgrade anytime to Member or Pro.
              </p>
            </div>

            <div className="relative mx-auto md:mx-0">
              {/* Replace /card.png with your card visual */}
              <div className="relative aspect-[16/10] w-full max-w-lg rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-700 p-6 ring-1 ring-zinc-700">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-300">TradesCard • Digital</span>
                  <span className="text-xs rounded-full bg-amber-400 px-2 py-1 text-zinc-900 font-semibold">
                    Member
                  </span>
                </div>
                <div className="mt-8 text-3xl font-bold">**** **** **** 4321</div>
                <div className="mt-6 text-sm text-zinc-300">Built for the trade</div>
                <Image
                  src="/card.png"
                  alt="TradesCard"
                  width={600}
                  height={380}
                  className="absolute -right-10 -bottom-10 hidden md:block opacity-20"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Proof strip */}
      <section className="border-y border-zinc-800 bg-zinc-900/40">
        <div className="mx-auto max-w-6xl px-4 py-6 md:py-8">
          <p className="text-center text-zinc-400 text-sm md:text-base">
            Trusted partner savings & rewards. Example partners:
          </p>
          <div className="mt-4 grid grid-cols-3 md:grid-cols-6 gap-4 opacity-80">
            {/* replace with real logos */}
            {["AA", "ToolStation", "Screwfix", "Costa", "Shell", "Wickes"].map((n) => (
              <div
                key={n}
                className="flex items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-300"
              >
                {n}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Three pillars */}
      <section className="mx-auto max-w-6xl px-4 py-12 md:py-16">
        <div className="grid md:grid-cols-3 gap-6">
          <PillarCard
            label="Offers"
            title="Save on what you already buy"
            copy="Fuel, tools, food and more. Curated deals for the trade — no faff."
            ctaLabel="See offers"
            href="/offers"
            badge="Save & Earn"
          />
          <PillarCard
            label="Benefits"
            title="Built-in protection and support"
            copy="Breakdown cover and wellbeing support. Clear, practical help when you need it."
            ctaLabel="View benefits"
            href="/benefits"
            badge="Protect & Support"
          />
          <PillarCard
            label="Rewards"
            title="Prizes worth winning"
            copy="Monthly draws and weekly giveaways. Entries included with paid plans."
            ctaLabel="See rewards"
            href="/rewards"
            badge="Win & Celebrate"
          />
        </div>
      </section>

      {/* Membership teaser */}
      <section className="mx-auto max-w-6xl px-4 pb-24 md:pb-28">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 md:p-8">
          <h2 className="text-2xl md:text-3xl font-bold">Choose a plan that pays for itself</h2>
          <p className="mt-2 text-zinc-300">
            Start on Access for free. Upgrade anytime for more savings, built-in benefits and
            better rewards.
          </p>
          <div className="mt-6 grid md:grid-cols-3 gap-4">
            <TierChip name="Access" price="£0" blurb="Sample offers, previews, upgrade prompts." />
            <TierChip
              name="Member"
              price="£2.99/mo"
              blurb="Full catalog, Protect Lite, 1 prize entry, digital card."
            />
            <TierChip
              name="Pro"
              highlight
              price="£7.99/mo"
              blurb="All Member perks + double entries, early offers, Pro-only deals."
            />
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/join"
              className="inline-flex items-center justify-center rounded-xl bg-amber-400 px-5 py-3 text-zinc-900 font-semibold hover:bg-amber-300"
            >
              Join free
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-3 hover:bg-zinc-800"
            >
              Compare plans
            </Link>
          </div>
          <p className="mt-2 text-xs text-zinc-400">Launch offer: £1 for 90 days.</p>
        </div>
      </section>

      {/* Footer CTA (desktop emphasis) */}
      <footer className="hidden md:block border-t border-zinc-800">
        <div className="mx-auto max-w-6xl px-4 py-10 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold">Built for the people who build Britain.</h3>
            <p className="text-zinc-400">Join today — save money, get protected, win rewards.</p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/join"
              className="inline-flex items-center justify-center rounded-xl bg-amber-400 px-5 py-3 text-zinc-900 font-semibold hover:bg-amber-300"
            >
              Join free
            </Link>
            <Link
              href="/offers"
              className="inline-flex items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-3 hover:bg-zinc-800"
            >
              Browse offers
            </Link>
          </div>
        </div>
      </footer>

      {/* spacer for mobile sticky bar */}
      <div className="h-16 md:hidden" />
    </main>
  );
}

function PillarCard(props: {
  label: string;
  title: string;
  copy: string;
  ctaLabel: string;
  href: string;
  badge: string;
}) {
  const { label, title, copy, ctaLabel, href, badge } = props;
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 md:p-6">
      <div className="mb-3 inline-flex items-center gap-2 text-xs text-zinc-300">
        <span className="rounded-full bg-zinc-800 px-2 py-1">{label}</span>
        <span className="text-zinc-400">•</span>
        <span className="text-zinc-400">{badge}</span>
      </div>
      <h3 className="text-xl font-bold">{title}</h3>
      <p className="mt-2 text-zinc-300">{copy}</p>
      <Link
        href={href}
        className="mt-4 inline-flex items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2 hover:bg-zinc-800"
      >
        {ctaLabel}
      </Link>
    </div>
  );
}

function TierChip(props: { name: string; price: string; blurb: string; highlight?: boolean }) {
  const { name, price, blurb, highlight } = props;
  return (
    <div
      className={`rounded-xl border p-4 ${
        highlight
          ? "border-amber-400/50 bg-amber-400/10 ring-1 ring-amber-400/30"
          : "border-zinc-800 bg-zinc-900/40"
      }`}
    >
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">{name}</h4>
        <span
          className={`text-sm ${
            highlight ? "text-amber-300" : "text-zinc-400"
          }`}
        >
          {price}
        </span>
      </div>
      <p className="mt-2 text-sm text-zinc-300">{blurb}</p>
    </div>
  );
}