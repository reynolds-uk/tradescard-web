"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      // wipe out auth/stripe noise and send to welcome
      url.searchParams.delete("code");
      url.searchParams.delete("state");
      url.searchParams.delete("status");
      url.searchParams.delete("success");
      url.searchParams.delete("canceled");
      window.history.replaceState({}, "", url.pathname);
    } catch {}
    router.replace("/welcome");
  }, [router]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 text-sm text-neutral-400">
      Finishing sign-in…
    </div>
  );
}