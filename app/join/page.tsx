// app/join/page.tsx
"use client";

import Link from "next/link";

type PlanProps = {
  name: string;
  price: string;
  blurb: string;
  href?: string;                 // if provided we render a Link button
  onClick?: () => void;          // otherwise a <button>
  highlight?: boolean;
  cta?: string;                  // <-- NEW: custom button label
};

function Plan({
  name,
  price,
  blurb,
  href,
  onClick,
  highlight,
  cta,
}: PlanProps) {
  const buttonLabel = cta ?? (href ? "Choose plan" : "Continue");
  const cardClass =
    "rounded-2xl border p-5 md:p-6 " +
    (highlight
      ? "border-amber-400/50 bg-amber-400/10 ring-1 ring-amber-400/30"
      : "border-neutral-800 bg-neutral-900/40");

  const ButtonInner = (
    <span className="inline-block rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm hover:bg-neutral-800">
      {buttonLabel}
    </span>
  );

  return (
    <div className={cardClass}>
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">{name}</h4>
        <span className={highlight ? "text-sm text-amber-300" : "text-sm text-neutral-400"}>
          {price}
        </span>
      </div>
      <p className="mt-2 text-sm text-neutral-300">{blurb}</p>

      <div className="mt-4">
        {href ? (
          <Link href={href}>{ButtonInner}</Link>
        ) : (
          <button onClick={onClick} className="rounded-lg">{ButtonInner}</button>
        )}
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-3xl font-bold">Join TradesCard</h1>
      <p className="mt-2 text-neutral-300">
        Start on Access for free. Upgrade anytime for more savings, benefits and rewards.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Plan
          name="Access"
          price="£0"
          blurb="Sample offers, previews, upgrade prompts."
          cta="Continue"
          onClick={() => (window as any).tradescardFocusSignin?.()}
        />
        <Plan
          name="Member"
          price="£2.99/mo"
          blurb="Full catalogue, Protect Lite, 1 prize entry, digital card."
          href="/pricing"
        />
        <Plan
          name="Pro"
          price="£7.99/mo"
          blurb="All Member perks + double entries, early offers, Pro-only deals."
          href="/pricing"
          highlight
        />
      </div>
    </main>
  );
}