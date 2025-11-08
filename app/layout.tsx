// app/layout.tsx
import "./globals.css";
import Nav from "./components/Nav";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export const metadata = {
  title: "TradesCard",
  description:
    "Offers, benefits and rewards for the UK trades community. Join free or pick a plan.",
  themeColor: "#0b0c0d",
};

function BuildStamp() {
  const env = process.env.VERCEL_ENV ?? "dev";
  const show =
    process.env.SHOW_BUILD_META === "true" || env !== "production";
  if (!show) return null;

  const sha = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local";
  const msg = process.env.VERCEL_GIT_COMMIT_MESSAGE ?? "";
  const note = process.env.BUILD_NOTE ?? "";
  const responsive = env === "production" ? "hidden sm:flex" : "flex";

  return (
    <footer className="border-t border-neutral-900/60">
      <div
        className={`mx-auto max-w-5xl px-4 py-3 text-[11px] text-neutral-500 items-center gap-3 ${responsive}`}
      >
        <span>env: {env}</span>
        <span>•</span>
        <span>build: {sha}</span>
        {note && (
          <>
            <span>•</span>
            <span className="truncate">{note}</span>
          </>
        )}
        {msg && (
          <>
            <span>•</span>
            <span className="truncate flex-1" title={msg}>
              {msg}
            </span>
          </>
        )}
      </div>
    </footer>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className="h-full">
      <body className="bg-neutral-950 text-neutral-100 antialiased min-h-dvh">
        {/* a11y: let keyboard users jump straight to the content */}
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 rounded-md bg-white/10 px-3 py-2 text-sm"
        >
          Skip to content
        </a>

        <Nav />

        {/* Pages keep their own <Container />; we still provide spacing for non-container pages */}
        <main id="content">{children}</main>

        <BuildStamp />
      </body>
    </html>
  );
}