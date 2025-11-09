// app/components/StatusPill.tsx
"use client";

function basePill(extra: string) {
  return `rounded px-2 py-0.5 text-[11px] leading-none ${extra}`;
}

export function TierPill({ tier }: { tier?: "access"|"member"|"pro"|string }) {
  const t = (tier ?? "access").toUpperCase();
  const cls =
    tier === "pro" ? basePill("bg-amber-900/30 text-amber-200 border border-amber-400/20")
    : tier === "member" ? basePill("bg-green-900/30 text-green-300 border border-green-400/20")
    : basePill("bg-neutral-800 text-neutral-300 border border-neutral-700/60");
  return <span className={cls} aria-label={`Tier: ${t}`}>{t}</span>;
}

export function StatusPill({ status }: { status?: string }) {
  const s = (status ?? "free").toLowerCase();
  const cls =
    s === "active" ? basePill("bg-green-900/30 text-green-300 border border-green-400/20")
    : s === "trialing" ? basePill("bg-amber-900/30 text-amber-200 border border-amber-400/20")
    : s === "past_due" ? basePill("bg-red-900/30 text-red-300 border border-red-400/20")
    : basePill("bg-neutral-800 text-neutral-300 border border-neutral-700/60");
  return <span className={cls} aria-label={`Status: ${s}`}>{s}</span>;
}