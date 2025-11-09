// app/auth/callback/page.tsx
"use client";

import { useEffect } from "react";
import CallbackClient from "./CallbackClient";

export default function AuthCallback() {
  // Clean noisy params (code/state/etc) but keep path intact
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      ["code", "state", "status", "success", "canceled", "error", "error_code", "error_description"]
        .forEach((k) => url.searchParams.delete(k));
      window.history.replaceState({}, "", url.pathname + (url.search || ""));
    } catch {}
  }, []);

  return (
    <>
      <div className="mx-auto max-w-5xl px-4 py-8 text-sm text-neutral-400">
        Finishing sign-in…
      </div>
      <CallbackClient />
    </>
  );
}