// app/layout.tsx (Server Component)
import "./globals.css";
import NextDynamic from "next/dynamic"; // ✅ rename to avoid clashing with export const dynamic

// Don’t SSR the header (prevents auth/client APIs from touching the server bundle)
const HeaderAuth = NextDynamic(() => import("./header-client"), { ssr: false });

// Route segment options
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-neutral-950 text-neutral-100">
        {/* Global header */}
        <header className="sticky top-0 z-10 border-b border-neutral-800/70 bg-neutral-950/80 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 rounded bg-neutral-800" aria-hidden />
              <div className="font-semibold">TradesCard</div>
            </div>

            <nav className="flex items-center gap-2 text-sm">
              <a href="/" className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700">Home</a>
              <a href="/rewards" className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700">Rewards</a>
              <a href="/account" className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700">Account</a>
            </nav>

            <div className="flex items-center gap-3">
              <HeaderAuth />
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}