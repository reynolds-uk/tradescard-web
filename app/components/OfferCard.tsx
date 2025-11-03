// src/components/OfferCard.tsx
type Offer = {
  id: string;
  category: string;
  title: string;
  partner?: string | null;
  code?: string | null;
  link?: string | null;
  visibility: 'public' | 'access' | 'member' | 'pro';
  starts_at?: string | null;
  ends_at?: string | null;
};

export function OfferCard({
  offer,
  onRedeem,
}: { offer: Offer; onRedeem: (o: Offer) => void }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
      <div className="text-xs text-neutral-400">{offer.category}</div>
      <div className="mt-0.5 text-lg font-medium">{offer.title}</div>
      {offer.partner && (
        <div className="mt-1 text-sm text-neutral-400">by {offer.partner}</div>
      )}
      <div className="mt-3 flex items-center gap-2">
        {offer.code && (
          <span className="text-xs rounded border border-neutral-700 bg-neutral-800 px-2 py-0.5">
            CODE: <span className="font-mono">{offer.code}</span>
          </span>
        )}
        <span className="ml-auto text-xs rounded bg-neutral-800 px-2 py-0.5">
          {offer.visibility.toUpperCase()}
        </span>
        <button
          onClick={() => onRedeem(offer)}
          className="rounded bg-amber-400 px-3 py-1.5 text-black text-sm font-medium"
        >
          Get deal
        </button>
      </div>
    </div>
  );
}