// app/join/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";

declare global {
  interface Window {
    tradescardFocusSignin?: () => void;
  }
}

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://tradescard-api.vercel.app";

type Tier = "access" | "member" | "pro";

type Me = {
  user_id: string;
  email: string;
  tier: Tier;
  status: string;
};

type ApiAccount = {
  user_id: string;
  email: string;
  members: null | {
    status: string;
    tier: Tier;
    current_period_end: string | null;
  };
};

// --- small UI atoms
function Badge({ children }: { children: string }) {
  return (
    <span className="rounded bg-neutral-800 px-2 py-0.5 text-xs">
      {children}
    </span>
  );
}

type PlanCardProps = {
  name: "Member" | "Pro";
  price: string;
  bullets: string[];
  highlight?: boolean;
  disabled?: boolean;
  cta: string;
  onClick?: () => void;
  ribbon?: string | null;
};

function PlanCard({
  name,
  price,
  bullets,
  highlight,
  disabled,
  cta,
  onClick,
  ribbon,
}: PlanCardProps) {
  const cardClass =
    "relative rounded-2xl border p-5 md:p-6 " +
    (highlight
      ? "border-amber-400/40 bg-amber-400/10 ring-1 ring-amber-400/30"
      : "border-neutral-800 bg-neutral-900/40");

  return (
    <div className={cardClass} aria-disabled={disabled}>
      {ribbon && (
        <span className="absolute right-3 -top-2 rounded bg-neutral-800 text-[11px] px-2 py-0.5">
          {ribbon}
        </span>
      )}
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">{name}</h4>
        <span className={highlight ? "text-sm text-amber-300" : "text-sm text-neutral-400"}>
          {price}
        </span>
      </div>
      <ul className="mt-3 space-y-1 text-sm text-neutral-300">
        {bullets.map((b, i) => (
          <li key={i}>• {b}</li>
        ))}
      </ul>
      <div className="mt-4">
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          className="rounded-lg disabled:opacity-60"
          aria-label={`Choose ${name}`}
        >
          <span className="inline-block rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm hover:bg-neutral-800">
            {cta}
          </span>
        </button>
      </div>
    </div>
  );
}

// --- page
export default function JoinPage() {
  const supabase = useMemo(
    () =>
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // capture ?next so we can return the user after auth/checkout
  const [nextPath, setNextPath] = useState<string | null>(null);
  useEffect(() => {
    const url = new URL(window.location.href);
    const nxt = url.searchParams.get("next");
    if (nxt) {
      setNextPath(nxt);
      // stash for header-client (magic link) to use after sign-in
      try {
        localStorage.setItem("tradescard_next_after_auth", nxt);
      } catch {}
    }
  }, []);

  const focusHeaderSignin = useCallback(() => {
    window.tradescardFocusSignin?.();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError("");

        const { data } = await supabase.auth.getSession();
        const user = data?.session?.user ?? null;

        if (!user) {
          setMe(null);
          return;
        }

        const r = await fetch(
          `${API_BASE}/api/account?user_id=${encodeURIComponent(user.id)}`,
          { cache: "no-store" }
        );
        if (!r.ok) throw new Error(`/api/account ${r.status}`);
        const acc: ApiAccount = await r.json();

        const tier: Tier = acc.members?.tier ?? "access";
        const status = acc.members?.status ?? "free";

        setMe({
          user_id: acc.user_id,
          email: acc.email,
          tier,
          status,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Something went wrong";
        setError(msg);
        setMe(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [supabase]);

  // Start / change plan via Stripe Checkout (signed-in only)
  const startMembership = async (plan: "member" | "pro") => {
    try {
      setBusy(true);
      setError("");

      const { data } = await supabase.auth.getSession();
      const user = data?.session?.user ?? null;

      if (!user) {
        // not signed in → focus email box; nextPath already stashed
        focusHeaderSignin();
        return;
      }

      const res = await fetch(`${API_BASE}/api/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          email: user.email,
          plan,
          next: nextPath || null,
        }),
        keepalive: true,
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.url) throw new Error(json?.error || "Checkout failed");
      window.location.href = json.url;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not start checkout";
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  // derived
  const isLoggedOut = !loading && !me;
  const isActive = me?.status === "active";
  const onMember = me?.tier === "member" && isActive;
  const onPro = me?.tier === "pro" && isActive;

  return (
    <Container>
      <PageHeader
        title="Join TradesCard"
        subtitle="Join free, or pick a plan with protection, early deals and monthly rewards. Switch or cancel any time."
        aside={
          isLoggedOut ? (
            <button
              onClick={focusHeaderSignin}
              className="rounded bg-neutral-800 hover:bg-neutral-700 px-3 py-2"
            >
              Sign in / Join
            </button>
          ) : (
            <div className="text-sm text-neutral-500 flex items-center gap-2">
              <Badge>{(me?.tier ?? "access").toUpperCase()}</Badge>
              <Badge>{me?.status ?? "free"}</Badge>
            </div>
          )
        }
      />

      {error && (
        <div className="mb-4 rounded border border-red-600/40 bg-red-900/10 px-3 py-2 text-red-300">
          {error}
        </div>
      )}

      {/* Plans (Member is the default path) */}
      <div className="grid gap-4 md:grid-cols-2">
        <PlanCard
          name="Member"
          price="£2.99/mo"
          bullets={[
            "Full offer access",
            "Protect Lite benefits",
            "Monthly prize entry",
            "Digital card",
          ]}
          cta={
            isLoggedOut
              ? "Choose Member"
              : onMember
              ? "Current plan"
              : "Choose Member"
          }
          disabled={onMember || busy}
          onClick={() => startMembership("member")}
          ribbon={onMember ? "Current" : null}
        />

        <PlanCard
          name="Pro"
          price="£7.99/mo"
          bullets={[
            "Everything in Member",
            "Early-access deals",
            "Pro-only offers",
            "Double prize entries",
          ]}
          highlight
          cta={
            isLoggedOut
              ? "Choose Pro"
              : onPro
              ? "Current plan"
              : me?.tier === "member"
              ? "Upgrade to Pro"
              : "Choose Pro"
          }
          disabled={onPro || busy}
          onClick={() => startMembership("pro")}
          ribbon={onPro ? "Current" : "Best value"}
        />
      </div>

      {/* Free join block */}
      <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900/50 p-5">
        <div className="flex items-center gap-2">
          <h3 className="font-medium">Prefer to start free?</h3>
          <Badge>FREE</Badge>
        </div>
        <p className="text-sm text-neutral-400 mt-1">
          Join free, redeem offers when signed in, and upgrade any time for protection,
          early deals and rewards entries.
        </p>
        <div className="mt-3">
          <button
            onClick={focusHeaderSignin}
            className="rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm hover:bg-neutral-800"
          >
            Join free
          </button>
        </div>
      </div>

      {/* Compliance footnote */}
      <div className="mt-6 text-[12px] text-neutral-500">
        No purchase necessary. Free postal entry route is available on public promo pages.
        Paid and free routes are treated equally in draws.
      </div>
    </Container>
  );
}