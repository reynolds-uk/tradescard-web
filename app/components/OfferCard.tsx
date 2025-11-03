type Offer = {
  id: string; title: string;
  category?: string | null; partner?: string | null;
  link?: string | null; badge?: string | null;
  onClick?: () => void;
};
export default function OfferCard({ category, title, partner, link, badge, onClick }: Offer) {
  const body = (
    <div
      className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 hover:bg-neutral-900 transition"
      onClick={onClick}
    >
      <div className="flex items-center gap-2">
        {badge && <span className="rounded bg-amber-400/20 text-amber-300 px-2 py-0.5 text-[11px]">{badge}</span>}
        {category && <span className="rounded bg-neutral-800 text-neutral-300 px-2 py-0.5 text-[11px]">{category}</span>}
      </div>
      <div className="mt-2 text-lg font-medium">{title}</div>
      {partner && <div className="text-xs text-neutral-400 mt-1">{partner}</div>}
    </div>
  );
  return link ? <a href={link} target="_blank" rel="noopener noreferrer">{body}</a> : body;
}