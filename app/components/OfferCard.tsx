// app/components/OfferCard.tsx
"use client";

import { useMemo } from "react";
import PrimaryButton from "./PrimaryButton";

type Visibility = "access" | "member" | "pro";

export type Offer = {
  id: string;
  category: string;
  title: string;
  partner?: string | null;
  code?: string | null;
  link?: string | null;
  visibility?: Visibility;
  starts_at?: string | null;
  ends_at?: string | null;
  is_active?: boolean | null;
};

const TIER_ORDER: Record<Visibility, number> = { access: 0, member: 1, pro: 2 };

type Props = {
  offer: Offer;
  onRedeem?: (offer: Offer) => void;

  /** Optional context to let the card lock/unlock itself */
  userTier?: Visibility;     // current user tier (if known)
  activePaid?: boolean;      // true if status is active|trialing for paid tiers

  /** New props used by /offers – still supported */
  disabled?: boolean;        // hard-disable, overrides computed logic
  ctaLabel?: string;

  /** Legacy prop (kept for compatibility). If provided, maps to disabled. */
  locked?: boolean;
};

function Pill({
  children,
  tone = "muted",
}: {
  children: React.ReactNode;
  tone?: "muted" | "ok" | "warn";
}) {
  const cls =
    tone === "ok"
      ? "bg-green-900/30 text-green-300"
      : tone === "warn"
      ? "bg-amber-900/30 text-amber-200"
      : "bg-neutral-900 text-neutral-300";
  return (
    <span className={`rounded px-2 py-0.5 text-[11px] tracking-wide ${cls}`}>
      {children}
    </span>
  );
}

function LockIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor" aria-hidden {...props}>
      <path d="M5 9V7a5 5 0 0110 0v2h1a1 1 0 011 1v8a1 1 0 01-1 1H4a1 1 0 01-1-1v-8a1 1 0 011-1h1zm2 0h6V7a3 3 0 10-6 0v2z" />
    </svg>
  );
}

function formatDate(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString();
}

export function OfferCard({
  offer,
  onRedeem,
  userTier,
  activePaid,
  disabled,
  ctaLabel,
  locked,
}: Props) {
  // Compute lock state:
  const computedLocked = useMemo(() => {
    // Explicit props win
    if (typeof disabled === "boolean") return disabled;
    if (typeof locked === "boolean") return locked;

    // If we know the user's tier, derive eligibility
    if (userTier) {
      const required = (offer.visibility ?? "member") as Visibility;
      const eligible =
        (activePaid && (userTier === "member" || userTier === "pro") && TIER_ORDER[userTier] >= TIER_ORDER[required]) ||
        // allow ACCESS offers always
        required === "access";
      return !eligible;
    }

    // Fallback: unknown -> assume unlocked (parent can still pass disabled/locked)
    return false;
  }, [disabled, locked, userTier, activePaid, offer.visibility]);

  const start = formatDate(offer.starts_at);
  const end = formatDate(offer.ends_at);

  // CTA label when locked (only used if parent doesn't pass ctaLabel)
  const defaultLockedLabel = useMemo(() => {
    const required = (offer.visibility ?? "member") as Visibility;
    if (!userTier) return "Join to redeem";
    if (!activePaid && required !== "access") return "Join to redeem";
    if (userTier === "member" && required === "pro") return "Upgrade to Pro";
    return required === "access" ? "Get offer" : "Unlock to redeem";
  }, [offer.visibility, userTier, activePaid]);

  const handleClick = () => {
    if (computedLocked) {
      // Let the parent decide; default to /join to keep the old behaviour
      if (!onRedeem) {
        window.location.href = "/join";
        return;
      }
    }
    if (onRedeem) {
      onRedeem(offer);
      return;
    }
    if (offer.link) {
      const ext = /^https?:\/\//i.test(offer.link);
      if (ext) window.open(offer.link, "_blank", "noopener,noreferrer");
      else window.location.href = offer.link;
    }
  };

  const tone: "muted" | "ok" | "warn" =
    (offer.visibility ?? "member") === "pro"
      ? "warn"
      : (offer.visibility ?? "member") === "member"
      ? "ok"
      : "muted";

  return (
    <div
      className={`rounded-2xl border p-5 transition ${
        computedLocked
          ? "border-neutral-800 bg-neutral-950/60"
          : "border-neutral-800 bg-neutral-900 hover:bg-neutral-800"
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <Pill>{offer.category}</Pill>
        {offer.visibility && (
          <Pill tone={tone}>{offer.visibility.toUpperCase()}</Pill>
        )}
      </div>

      <div className="text-base font-semibold">{offer.title}</div>
      {offer.partner && (
        <div className="mt-1 text-sm text-neutral-400">{offer.partner}</div>
      )}

      {(start || end) && (
        <div className="mt-1 text-[12px] text-neutral-500">
          {start && end && <>Valid {start} – {end}</>}
          {start && !end && <>Starts {start}</>}
          {!start && end && <>Ends {end}</>}
        </div>
      )}

      <div className="mt-4">
        {!computedLocked ? (
          <PrimaryButton onClick={handleClick}>
            {ctaLabel ?? "Get offer"}
          </PrimaryButton>
        ) : (
          <button
            onClick={handleClick}
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-200 hover:bg-neutral-800"
          >
            <LockIcon />
            {ctaLabel ?? defaultLockedLabel}
          </button>
        )}
      </div>
    </div>
  );
}