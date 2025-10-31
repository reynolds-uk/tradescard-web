"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function HeaderAuth() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string>("");

  const sendMagic = async () => {
    setErr("");
    try {
      const base =
        // prefer explicit env if you set it in Vercel/Supabase
        process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
        // otherwise use the runtime page origin (handles localhost vs prod)
        window.location.origin;

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${base}/auth/callback`,
        },
      });
      if (error) throw error;
      setSent(true);
    } catch (e: any) {
      setErr(e.message || "Failed to send link");
    }
  };

  return (
    <div className="flex gap-2 items-center">
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@company.com"
        className="px-2 py-1 rounded bg-neutral-900 border border-neutral-800"
      />
      <button onClick={sendMagic} className="px-3 py-1 rounded bg-neutral-800 hover:bg-neutral-700">
        Send magic link
      </button>
      {sent && <span className="text-xs text-neutral-400">Check your email…</span>}
      {err && <span className="text-xs text-red-400">Error: {err}</span>}
    </div>
  );
}