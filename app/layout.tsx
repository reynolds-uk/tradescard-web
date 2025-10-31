
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "TradesCard", description: "Simple checkout to your TradesCard API" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en"><body>{children}</body></html>);
}
