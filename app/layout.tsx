// app/layout.tsx
import "./globals.css";
import Nav from "./components/Nav";
import SiteFooter from "./components/SiteFooter";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

function BuildStamp() {
  const env = process.env.VERCEL_ENV ?? "dev";
  const show = process.env.SHOW_BUILD_META === "true" || env !== "production";
  if (!show) return null;

  const sha = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local";
  const msg = process.env.VERCEL_GIT_COMMIT_MESSAGE ?? "";
  const note = process.env.BUILD_NOTE ?? "";
  const responsive = env === "production" ? "hidden sm:flex" : "flex";

  return (
    <footer className="border-t border-neutral-900/60">
      <div
        className={`mx-auto max-w-5xl items-center gap-3 px-4 py-3 text-[11px] text-neutral-500 ${responsive}`}
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
            <span className="flex-1 truncate" title={msg}>
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
    <html lang="en">
      <body className="bg-neutral-950 text-neutral-100 antialiased">
        <Nav />
        {children}
        <SiteFooter />
        <BuildStamp />
      </body>
    </html>
  );
}