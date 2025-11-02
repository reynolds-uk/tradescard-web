// app/layout.tsx
import "./globals.css";
import Nav from "./components/Nav";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

function BuildStamp() {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local";
  const env = process.env.VERCEL_ENV ?? "dev";
  const msg = process.env.VERCEL_GIT_COMMIT_MESSAGE ?? "";
  return (
    <footer className="border-t border-neutral-900/60">
      <div className="mx-auto max-w-5xl px-4 py-3 text-[11px] text-neutral-500 flex items-center gap-3">
        <span>env: {env}</span>
        <span>•</span>
        <span>build: {sha}</span>
        {msg && (
          <>
            <span>•</span>
            <span className="truncate" title={msg}>
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
      <body className="bg-neutral-950 text-neutral-100">
        <Nav />
        {children}
        <BuildStamp />
      </body>
    </html>
  );
}