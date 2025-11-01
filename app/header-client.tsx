"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

type Props = {
  /** Where to land after the Supabase callback completes */
  nextPath?: string; // default: "/account"
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function HeaderAuth({ nextPath = "/account" }: Props) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );
  const [err, setErr] = useState<string>("");

  const isValidEmail = (v: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

  const sendMagic = async () => {
    setErr("");
    if (!isValidEmail(email)) {
      setStatus("error");
      setErr("Please enter a valid email address.");
      return;
    }

    try {
      setStatus("sending");

      // Prefer explicit site URL (set in Vercel > Settings > Environment Variables)
      // Falls back to current origin for local/dev.
      const base =
        process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
        window.location.origin;

      const redirectTo = `${base}/auth/callback?next=${encodeURIComponent(
        nextPath
      )}`;

      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      if (error) throw error;

      setStatus("sent");
    } catch (e: any) {
      setStatus("error");
      setErr(e?.message || "Failed to send magic link.");
    }
  };

  const disabled = status === "sending";

  return (
    <div className="flex items-center gap-2">
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        inputMode="email"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        placeholder="you@company.com"
        className="px-2 py-1 rounded bg-neutral-900 border border-neutral-800 text-sm"
        aria-label="Email address"
      />
      <button
        onClick={sendMagic}
        disabled={disabled}
        className={`px-3 py-1 rounded text-sm ${
          disabled
            ? "bg-neutral-800/60 text-neutral-400 cursor-not-allowed"
            : "bg-neutral-800 hover:bg-neutral-700"
        }`}
      >
        {status === "sending" ? "Sending…" : "Send magic link"}
      </button>

      {status === "sent" && (
        <span className="text-xs text-neutral-400">Check your email for the link.</span>
      )}
      {status === "error" && err && (
        <span className="text-xs text-red-400">Error: {err}</span>
      )}
    </div>
  );
}