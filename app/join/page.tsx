// app/join/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";

type Tier = "access" | "member" | "pro";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://tradescard-api.vercel.app";

const TIERS: Array<{
  id: Tier;
  title: string;
  price: string;
  blurb: string;
  highlight?: boolean;
}> = [
  { id: "access", title: "Access", price: "Free", blurb: "Browse all public offers.", highlight: false },
  { id: "member", title: "Member", price: "£2.99/mo", blurb: "Core protection + prize draw entries.", highlight: true },
  { id: "pro", title: "Pro", price: "£7.99/mo", blurb: "Everything in Member + early deals + 1.5× entries.", highlight: false },
];

export default function JoinPage() {
  const supabase = useMemo(
    () => createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ),
    []
  );

  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [err, setErr] = useState("");

  const busyRef = useRef(false);

  // Clear noisy params (auth/stripe), detect session
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      if (["status", "success", "canceled", "auth_error"].some(k => url.searchParams.has(k))) {
        window.history.replaceState({}, "", url.pathname);
      }
    } catch {/* no-op */}

    (async () => {
      const { data } = await supabase.auth.getSession();
      setSignedIn(!!data?.session?.user);
    })();
  }, [supabase]);

  async function sendMagicLink() {
    try {
      setErr("");
      setSending(true);
      if (!email.includes("@")) {
        setErr("Enter a valid email.");
        return;
      }
      await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/join`,
        },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not send sign-in link";
      setErr(msg);
    } finally {
      setSending(false);
    }
  }

  async function startCheckout(plan: "member" | "pro") {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      setErr("");

      const { data } = await supabase.auth.getSession();
      const user = data?.session?.user ?? null;

      if (!user) {
        setErr("Please sign in first using the email box above.");
        return;
      }

      const r = await fetch(`${API_BASE}/api/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id, email: user.email, plan }),
        keepalive: true,
      });
      const json = await r.json().catch(() => ({} as any));
      if (!r.ok || !json?.url) throw new Error(json?.error || "Checkout failed");
      window.location.href = json.url;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not start checkout";
      setErr(msg);
    } finally {
      busyRef.current = false;
    }
  }

  function chooseAccess() {
    // Free path → minimal welcome and upgrade nudge
    window.location.href = "/welcome";
  }

  return (
    <Container>
      <PageHeader
        title="Join TradesCard"
        subtitle="Pick a plan. Switch or cancel any time."
      />

      {/* Email step */}
      <div className="mb-6 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
        <div className="mb-2 text-sm text-neutral-300">
          {signedIn ? "You're signed in. Choose your plan below." : "Enter your email to get a magic sign-in link."}
        </div>
        {!signedIn && (
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 outline-none"
            />
            <button
              onClick={sendMagicLink}
              disabled={sending}
              className="rounded-lg px-4 py-2 font-medium bg-amber-400 text-black disabled:opacity-60"
            >
              {sending ? "Sending…" : "Send sign-in link"}
            </button>
          </div>
        )}
        {err && <div className="mt-2 text-sm text-red-400">{err}</div>}
      </div>

      {/* Plans */}
      <div className="grid gap-4 md:grid-cols-3">
        {TIERS.map((t) => (
          <div
            key={t.id}
            className={[
              "rounded-2xl border p-5",
              t.highlight
                ? "border-amber-400/40 bg-amber-400/10 ring-1 ring-amber-400/30"
                : "border-neutral-800 bg-neutral-900"
            ].join(" ")}
          >
            <div className="flex items-baseline justify-between">
              <div className="text-lg font-semibold">{t.title}</div>
              <div className="text-sm opacity-80">{t.price}</div>
            </div>
            <div className="mt-1 text-sm text-neutral-300">{t.blurb}</div>

            <div className="mt-4">
              {t.id === "access" ? (
                <button
                  onClick={chooseAccess}
                  className="w-full rounded-lg bg-neutral-800 hover:bg-neutral-700 px-4 py-2"
                >
                  Join free
                </button>
              ) : (
                <button
                  onClick={() => startCheckout(t.id)}
                  className="w-full rounded-lg bg-amber-400 text-black hover:opacity-90 px-4 py-2 font-medium"
                >
                  {t.id === "member" ? "Join as Member" : "Go Pro"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 text-[12px] text-neutral-500">
        No purchase necessary — a free postal entry route is available on public promo pages. Paid and
        free routes are treated equally in draws.
      </div>
    </Container>
  );
}