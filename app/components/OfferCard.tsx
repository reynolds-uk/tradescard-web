// app/components/OfferCard.tsx
"use client";

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
  locked?: boolean;                        // if true, show “Join/Upgrade” CTA
  onRedeem?: (offer: Offer) => void;       // click handler
};

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded bg-neutral-900 px-2 py-0.5 text-[11px] tracking-wide">
      {children}
    </span>
  );
}

export function OfferCard({ offer, locked = false, onRedeem }: Props) {
  const handleClick = () => {
    if (locked) {
      // send to join/upgrade; adjust route as needed
      window.location.href = "/join";
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
        locked
          ? "border-neutral-800 bg-neutral-950/60"
          : "border-neutral-800 bg-neutral-900 hover:bg-neutral-800"
      }`}
    >
      <div className="mb-2 flex items-center justify-between">
        <Pill>{offer.category}</Pill>
        {offer.visibility && (
          <span className="rounded bg-neutral-900 px-2 py-0.5 text-[11px]">
            {offer.visibility.toUpperCase()}
          </span>
        )}
      </div>

      <div className="text-base font-semibold">{offer.title}</div>
      {offer.partner && (
        <div className="mt-1 text-sm text-neutral-400">{offer.partner}</div>
      )}

      <div className="mt-4">
        <button
          onClick={handleClick}
          className={`rounded-lg px-3 py-1.5 text-sm ${
            locked
              ? "bg-neutral-800 text-neutral-400"
              : "bg-amber-400 text-black hover:bg-amber-300"
          }`}
        >
          {locked ? "Join to unlock" : "Get offer"}
        </button>
      </div>
    </div>
  );
}