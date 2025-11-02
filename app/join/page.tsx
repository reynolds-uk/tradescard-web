// app/join/page.tsx
export const dynamic = "force-dynamic";

export default function JoinPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold">Join TradesCard — free</h1>
      <p className="mt-2 text-neutral-300">
        Start on Access for free. Upgrade anytime to Member or Pro.
      </p>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
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
          href="/pricing#member"
        />
        <Plan
          name="Pro"
          price="£7.99/mo"
          blurb="All Member perks + double entries, early offers, Pro-only deals."
          href="/pricing#pro"
          highlight
        />
      </section>

      <aside className="mt-8 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
        <p className="text-sm text-neutral-300">
          Already have an account? Enter your email in the header to get a magic link.
        </p>
      </aside>
    </main>
  );
}

function Plan({
  name, price, blurb, href, onClick, highlight = false,
}: {
  name: string; price: string; blurb: string; href?: string;
  onClick?: () => void; highlight?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-xl border p-5",
        highlight ? "border-amber-400/50 bg-amber-400/10 ring-1 ring-amber-400/30"
                  : "border-neutral-800 bg-neutral-900/40",
      ].join(" ")}
    >
      <div className="flex items-baseline justify-between">
        <h3 className="font-semibold">{name}</h3>
        <span className={highlight ? "text-amber-300" : "text-neutral-400"}>{price}</span>
      </div>
      <p className="mt-2 text-sm text-neutral-300">{blurb}</p>
      {href ? (
        <a href={href} className="mt-4 inline-flex rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-2 hover:bg-neutral-800">
          Select {name}
        </a>
      ) : (
        <button onClick={onClick} className="mt-4 inline-flex rounded-lg bg-amber-400 px-4 py-2 font-medium text-neutral-900 hover:bg-amber-300">
          Continue with email
        </button>
      )}
    </div>
  );
}