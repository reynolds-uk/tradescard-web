// app/join/page.tsx
"use client";

import { useState } from "react";
import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import { useJoinModal } from "@/components/JoinModalContext";

type Billing = "monthly" | "annual";

const PRICES = {
  member: {
    monthly: { label: "£2.99/mo", sub: "billed monthly" },
    annual: { label: "£29.99/yr", sub: "≈£2.50/mo · save ~2 months" },
  },
  pro: {
    monthly: { label: "£7.99/mo", sub: "billed monthly" },
    annual: { label: "£79.99/yr", sub: "≈£6.67/mo · save ~2 months" },
  },
} as const;

function Badge({ children }: { children: string }) {
  return (
    <span className="rounded bg-neutral-800 px-2 py-0.5 text-[11px]">
      {children}
    </span>
  );
}

export default function JoinPage() {
  const { openJoin } = useJoinModal();
  const [billing, setBilling] = useState<Billing>("monthly");

  return (
    <Container>
      <PageHeader
        title="Join TradesCard"
        subtitle="Join free, or pick a plan with protection, early deals and monthly rewards. Switch or cancel any time."
        aside={
          <button
            onClick={() => openJoin("member")}
            className="rounded bg-neutral-800 hover:bg-neutral-700 px-3 py-2"
          >
            Sign in / Join
          </button>
        }
      />

      {/* Billing toggle */}
      <div className="mb-4 inline-flex rounded-lg border border-neutral-800 p-1 text-sm">
        <button
          className={
            "px-3 py-1 rounded-md " +
            (billing === "monthly"
              ? "bg-neutral-200 text-neutral-900"
              : "text-neutral-300 hover:text-neutral-100")
          }
          onClick={() => setBilling("monthly")}
          aria-pressed={billing === "monthly"}
        >
          Monthly
        </button>
        <button
          className={
            "px-3 py-1 rounded-md " +
            (billing === "annual"
              ? "bg-neutral-200 text-neutral-900"
              : "text-neutral-300 hover:text-neutral-100")
          }
          onClick={() => setBilling("annual")}
          aria-pressed={billing === "annual"}
        >
          Annual <span className="ml-1 text-[11px] opacity-70">(save ~2 months)</span>
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Member teaser card */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5">
          <div className="flex items-baseline justify-between gap-3">
            <h4 className="font-semibold">Member</h4>
            <div className="text-right">
              <div
                className={
                  billing === "annual" ? "text-sm text-amber-300" : "text-sm text-neutral-400"
                }
              >
                {PRICES.member[billing].label}
              </div>
              <div className="text-[11px] text-neutral-500">
                {PRICES.member[billing].sub}
              </div>
            </div>
          </div>

          <ul className="mt-3 space-y-1 text-sm text-neutral-300">
            <li>• Full offer access</li>
            <li>• Protect Lite benefits</li>
            <li>• Monthly prize entry</li>
            <li>• Digital card</li>
          </ul>

          <div className="mt-4">
            <button
              onClick={() => openJoin("member")}
              className="inline-block rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm hover:bg-neutral-800"
            >
              Choose Member
            </button>
          </div>
        </div>

        {/* Pro teaser card */}
        <div className="relative rounded-2xl border border-amber-400/40 bg-amber-400/10 p-5 ring-1 ring-amber-400/30">
          <span className="absolute right-3 -top-2 rounded bg-neutral-800 text-[11px] px-2 py-0.5">
            Best value
          </span>
          <div className="flex items-baseline justify-between gap-3">
            <h4 className="font-semibold">Pro</h4>
            <div className="text-right">
              <div className="text-sm text-amber-300">
                {PRICES.pro[billing].label}
              </div>
              <div className="text-[11px] text-amber-200/80">
                {PRICES.pro[billing].sub}
              </div>
            </div>
          </div>

          <ul className="mt-3 space-y-1 text-sm text-neutral-200">
            <li>• Everything in Member</li>
            <li>• Early-access deals & Pro-only offers</li>
            <li>• Double prize entries</li>
          </ul>

          <div className="mt-4">
            <button
              onClick={() => openJoin("pro")}
              className="inline-block rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm hover:bg-neutral-800"
            >
              Choose Pro
            </button>
          </div>
        </div>
      </div>

      {/* Access panel */}
      <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900/50 p-5">
        <div className="flex items-center gap-2">
          <h3 className="font-medium">Prefer to start free?</h3>
          <Badge>FREE</Badge>
        </div>
        <p className="text-sm text-neutral-400 mt-1">
          Join free, redeem offers when signed in, and upgrade any time for protection,
          early deals and rewards entries.
        </p>
        <div className="mt-3">
          <button
            onClick={() => openJoin("access")}
            className="rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm hover:bg-neutral-800"
          >
            Join free
          </button>
        </div>
      </div>

      <p className="mt-6 text-[12px] text-neutral-500">
        No purchase necessary. A free postal entry route is available on public promo pages.
        Paid and free routes are treated equally in draws.
      </p>
    </Container>
  );
}