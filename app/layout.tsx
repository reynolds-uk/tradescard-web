// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import HeaderClient from "./header-client";

export const metadata: Metadata = {
  title: "TradesCard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-neutral-950 text-neutral-100">
        {/* Client-only header (auth UI) */}
        <HeaderClient />
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}