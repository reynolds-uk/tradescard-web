// app/components/OfferCard.tsx
"use client";

import { useMemo } from "react";

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

type Props = {
  offer: Offer;
  onRedeem?: (offer: Offer) => void;

  /** Teaser override for locked state */
  ctaLabel?: string;

  /** New: current user context */
  userTier?: "access" | "member" | "pro";
  activePaid?: boolean;
};

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded bg-neutral-900 px-2 py-0.5 text-[11px] tracking-wide">
      {children}
    </span>
  );
}

function formatDate(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString();
}

export function OfferCard({ offer, onRedeem, ctaLabel, userTier = "access", activePaid = false }: Props) {
  const isLocked = useMemo(() => !activePaid, [activePaid]);

  const start = formatDate(offer.starts_at);
  const end = formatDate(offer.ends_at);

  const handleClick = () => {
    if (isLocked) {
      // parent handles routing to /join
      if (!onRedeem) window.location.href = "/join";
      return;
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

  return (
    <div
      className={`rounded-2xl border p-5 transition ${
        isLocked ? "border-neutral-800 bg-neutral-950/60" : "border-neutral-800 bg-neutral-900 hover:bg-neutral-800"
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <Pill>{offer.category}</Pill>

        {/* Hide visibility tag for paid users to avoid devaluing membership */}
        {!activePaid && offer.visibility && (
          <span className="rounded bg-neutral-900 px-2 py-0.5 text-[11px]">
            {offer.visibility.toUpperCase()}
          </span>
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
        <button
          onClick={handleClick}
          type="button"
          className={`rounded-lg px-3 py-1.5 text-sm flex items-center gap-2 ${
            isLocked
              ? "bg-neutral-800 text-neutral-300"
              : "bg-amber-400 text-black hover:bg-amber-300"
          }`}
        >
          {isLocked ? (ctaLabel ?? "Unlock to redeem") : "Get offer"}
        </button>
      </div>
    </div>
  );
}