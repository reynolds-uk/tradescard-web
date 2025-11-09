// app/components/SiteFooter.tsx
export default function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-8 border-t border-neutral-900/60">
      {/* Trust strip */}
      <div className="mx-auto grid max-w-5xl gap-2 px-4 py-6 text-center text-[13px] text-neutral-400 sm:grid-cols-3">
        <div className="sm:text-left">
          Secure checkout by <span className="text-neutral-200">Stripe</span>
        </div>
        <div>Cancel any time in <span className="text-neutral-200">Manage billing</span></div>
        <div className="sm:text-right">
          No spam. We’ll only email about <span className="text-neutral-200">TradeCard</span>.
        </div>
      </div>

      {/* Legal row */}
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-4 gap-y-2 px-4 pb-6 text-xs text-neutral-500 sm:justify-between">
        <div className="flex gap-4">
          <a href="/privacy" className="hover:text-neutral-300">Privacy</a>
          <a href="/terms" className="hover:text-neutral-300">Terms</a>
          <a href="/contact" className="hover:text-neutral-300">Contact</a>
        </div>
        <div className="opacity-70">© {year} TradeCard</div>
      </div>
    </footer>
  );
}