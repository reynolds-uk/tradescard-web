// app/components/ActivateEmailOverlay.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter, useSearchParams } from "next/navigation";

const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ActivateEmailOverlay({ email }: { email: string }) {
  const router = useRouter();
  const [cooldown, setCooldown] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stop any rogue timers on unmount
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const startCooldown = (secs = 30) => {
    setCooldown(secs);
    timerRef.current && clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCooldown((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  const handleResend = async () => {
    setError(null);
    setSending(true);
    try {
      // Fire a fresh magic-link to the same email
      const { error } = await supa.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/welcome` },
      });
      if (error) throw error;
      startCooldown(30);
    } catch (e: any) {
      setError(e?.message ?? "Could not resend email.");
    } finally {
      setSending(false);
    }
  };

  const handleDifferentEmail = async () => {
    // best-effort: clear only local session to keep webhook flows intact
    await supa.auth.signOut({ scope: "local" });
    const url = new URL("/join", window.location.origin);
    url.searchParams.set("mode", "join");
    url.searchParams.set("free", "1");
    router.replace(url.toString());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-[92vw] max-w-[520px] rounded-2xl border border-amber-500/30 bg-neutral-900 p-6 shadow-2xl">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-amber-500/40">
          <span className="text-xl">✉️</span>
        </div>
        <h2 className="mb-2 text-center text-xl font-semibold">Check your email to activate</h2>
        <p className="mb-1 text-center text-neutral-300">
          We’ve sent a secure sign-in link to <strong className="text-neutral-100">{email}</strong>.
          Click it to confirm your account — then return here to finish setup.
        </p>
        <p className="mb-4 text-center text-neutral-400 text-sm">
          We’ve emailed you a one-time link. Open it to activate your account.
        </p>

        {error && <p className="mb-3 text-center text-sm text-red-400">{error}</p>}

        <div className="flex items-center justify-center gap-4">
          <button
            onClick={handleResend}
            disabled={sending || cooldown > 0}
            className={`rounded-md px-3 py-2 text-sm font-medium ${
              sending || cooldown > 0
                ? "cursor-not-allowed bg-neutral-800 text-neutral-500"
                : "bg-neutral-100 text-neutral-900 hover:bg-white"
            }`}
          >
            {cooldown > 0 ? `Resend link in ${cooldown}s` : "Resend link"}
          </button>

          <button
            onClick={handleDifferentEmail}
            className="text-sm text-neutral-300 underline underline-offset-4 hover:text-white"
          >
            Use a different email
          </button>
        </div>

        <p className="mt-4 text-center text-xs text-neutral-500">
          Tip: check your spam or promotions folder if it hasn’t arrived within a minute.
        </p>
      </div>
    </div>
  );
}