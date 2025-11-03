// app/components/JoinGate.tsx
"use client";

import { useState } from "react";
import { useAuthTier } from "./useAuthTier";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://tradescard-api.vercel.app";

type Offer = {
  id: string;
  title: string;
  partner?: string | null;
  link?: string | null;
};

export default function JoinGate({
  open,
  onClose,
  offer,
}: {
  open: boolean;
  onClose: () => void;
  offer: Offer;
}) {
  const { loading, userId, email, tier, status, supabase } = useAuthTier();
  const [busy, setBusy] = useState(false);
  const isPaid = tier === "member" || tier === "pro";
  const canRedeem = isPaid && status === "active";

  const sendMagicLink = async (targetEmail: string) => {
    setBusy(true);
    try {
      // deep-link back to the offer after auth
      const redirectTo = `${window.location.origin}/offers?offer=${offer.id}`;
      const { error } = await supabase.auth.signInWithOtp({
        email: targetEmail,
        options: { emailRedirectTo: redirectTo },
      });
      if (error) throw error;
      alert("Magic link sent. Please check your email.");
    } catch (e) {
      alert((e as Error)?.message ?? "Unable to send link");
    } finally {
      setBusy(false);
    }
  };

  const startCheckout = async (plan: "member" | "pro") => {
    setBusy(true);
    try {
      if (!userId) {
        alert("Please sign in first.");
        return;
      }
      const res = await fetch(`${API_BASE}/api/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          email,
          plan,
          return_url: `${window.location.origin}/offers?offer=${offer.id}`,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.url) throw new Error(json?.error || "Checkout failed");
      window.location.href = json.url;
    } catch (e) {
      alert((e as Error)?.message ?? "Checkout failed");
    } finally {
      setBusy(false);
    }
  };

  const redeem = async () => {
    setBusy(true);
    try {
      // track click
      await fetch(`${API_BASE}/api/redemptions/click`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offer_id: offer.id, user_id: userId }),
      }).catch(() => {});
      if (offer.link) window.open(offer.link, "_blank", "noopener,noreferrer");
      onClose();
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60">
      <div className="w-full max-w-lg rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
        <div className="mb-2 flex items-start justify-between">
          <div>
            <div className="text-xs text-neutral-400">Offer</div>
            <div className="text-lg font-semibold">{offer.title}</div>
          </div>
          <button onClick={onClose} className="rounded bg-neutral-900 px-2 py-1 hover:bg-neutral-800">Close</button>
        </div>

        {/* state 1: not logged in */}
        {!loading && !userId && (
          <div className="space-y-3">
            <p className="text-sm text-neutral-300">
              Join free to see and redeem offers. We’ll email you a magic sign-in link.
            </p>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const em = String(fd.get("email") || "").trim();
                if (!em) return;
                sendMagicLink(em);
              }}
            >
              <input
                name="email"
                type="email"
                required
                placeholder="you@work.com"
                className="w-full rounded-lg bg-neutral-900 px-3 py-2 outline-none"
              />
              <button disabled={busy} className="rounded-lg bg-amber-400 px-3 py-2 text-black font-medium disabled:opacity-60">
                {busy ? "Sending…" : "Send link"}
              </button>
            </form>
            <p className="text-xs text-neutral-500">
              By continuing you agree to our terms and privacy policy.
            </p>
          </div>
        )}

        {/* state 2: logged in but free / inactive */}
        {!loading && userId && !canRedeem && (
          <div className="space-y-3">
            <p className="text-sm text-neutral-300">
              Upgrade to unlock this offer and monthly rewards.
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                onClick={() => startCheckout("member")}
                disabled={busy}
                className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 text-left hover:bg-neutral-800 disabled:opacity-60"
              >
                <div className="text-xs text-neutral-400">Paid</div>
                <div className="mt-1 font-semibold">Member</div>
                <div className="text-sm text-neutral-400">£2.99 / month</div>
                <ul className="mt-2 text-sm text-neutral-300 space-y-1">
                  <li>• Full catalogue</li>
                  <li>• Prize entries</li>
                </ul>
              </button>
              <button
                onClick={() => startCheckout("pro")}
                disabled={busy}
                className="rounded-xl border border-amber-400/40 bg-amber-400/10 p-4 text-left hover:bg-amber-400/20 disabled:opacity-60"
              >
                <div className="text-xs text-neutral-400">Paid</div>
                <div className="mt-1 font-semibold">Pro</div>
                <div className="text-sm text-neutral-400">£7.99 / month</div>
                <ul className="mt-2 text-sm text-neutral-300 space-y-1">
                  <li>• Everything in Member</li>
                  <li>• Early/Pro-only offers</li>
                  <li>• Higher rewards boost</li>
                </ul>
              </button>
            </div>
          </div>
        )}

        {/* state 3: logged in and paid/active */}
        {!loading && userId && canRedeem && (
          <div className="space-y-3">
            <p className="text-sm text-neutral-300">
              You’re all set. Click below to redeem this offer.
            </p>
            <button
              onClick={redeem}
              disabled={busy}
              className="rounded-lg bg-amber-400 px-4 py-2 text-black font-medium disabled:opacity-60"
            >
              {busy ? "Opening…" : "Redeem offer"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}