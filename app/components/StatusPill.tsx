// app/components/StatusPill.tsx
"use client";

export function TierPill({ tier }: { tier?: "access"|"member"|"pro"|string }) {
  const t = (tier ?? "access").toUpperCase();
  const cls =
    tier === "pro" ? "bg-amber-900/30 text-amber-200"
    : tier === "member" ? "bg-green-900/30 text-green-300"
    : "bg-neutral-800 text-neutral-300";
  return <span className={`rounded px-2 py-0.5 text-[11px] ${cls}`}>{t}</span>;
}

export function StatusPill({ status }: { status?: string }) {
  const s = (status ?? "free").toLowerCase();
  const cls =
    s === "active" ? "bg-green-900/30 text-green-300"
    : s === "trialing" ? "bg-amber-900/30 text-amber-200"
    : s === "past_due" ? "bg-red-900/30 text-red-300"
    : "bg-neutral-800 text-neutral-300";
  return <span className={`rounded px-2 py-0.5 text-[11px] ${cls}`}>{s}</span>;
}