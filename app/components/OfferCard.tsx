// app/components/OfferCard.tsx  (add gating)
"use client";
import { useState } from "react";
import JoinGate from "./JoinGate";
import { useAuthTier } from "./useAuthTier";

export function OfferCard({
  offer,
  onRedeem, // optional, used if already eligible
}: {
  offer: { id:string; category:string; title:string; partner?:string|null; link?:string|null };
  onRedeem?: (o:any)=>void;
}) {
  const { loading, tier, status } = useAuthTier();
  const [open, setOpen] = useState(false);
  const eligible = !loading && (tier === "member" || tier === "pro") && status === "active";

  return (
    <>
      <button
        onClick={() => (eligible && onRedeem ? onRedeem(offer) : setOpen(true))}
        className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5 text-left hover:bg-neutral-800"
      >
        <div className="mb-2 inline-block rounded bg-neutral-800 px-2 py-0.5 text-xs">
          {offer.category}
        </div>
        <div className="text-lg font-semibold">{offer.title}</div>
        {offer.partner && <div className="mt-1 text-sm text-neutral-400">{offer.partner}</div>}
      </button>

      <JoinGate open={open} onClose={() => setOpen(false)} offer={offer} />
    </>
  );
}