// app/layout.tsx
import "./globals.css";
import Nav from "./components/Nav";
import { JoinModalProvider } from "./components/JoinModalContext";
import JoinModalHost from "./components/JoinModalHost";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

function BuildStamp() {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local";
  const env = process.env.VERCEL_ENV ?? "dev";
  const msg = process.env.VERCEL_GIT_COMMIT_MESSAGE ?? "";

  // Hide verbose stamp on tiny screens, keep it lightweight in prod
  const hidden = env === "production" ? "sm:flex" : "flex";

  return (
    <footer className="border-t border-neutral-900/60">
      <div
        className={`mx-auto max-w-5xl px-4 py-3 text-[11px] text-neutral-500 items-center gap-3 ${hidden}`}
      >
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
      <body className="bg-neutral-950 text-neutral-100 antialiased">
        {/* App-wide join/sign-in context + modal host */}
        <JoinModalProvider>
          <Nav />
          {/* Pages themselves handle <Container /> to keep widths consistent */}
          {children}
          <BuildStamp />
          <JoinModalHost />
        </JoinModalProvider>
      </body>
    </html>
  );
}