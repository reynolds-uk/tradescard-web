// app/join/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import Link from "next/link";

declare global {
  interface Window {
    tradescardFocusSignin?: () => void;
  }
}

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://tradescard-api.vercel.app";

type Me = {
  user_id: string;
  email: string;
  tier: "access" | "member" | "pro";
  status: string;
} | null;

type ApiAccount = {
  user_id: string;
  email: string;
  members: null | {
    status: string;
    tier: "access" | "member" | "pro";
    current_period_end: string | null;
  };
};

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
  href?: string;
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
  href,
  ribbon,
}: PlanCardProps) {
  const cardClass =
    "relative rounded-2xl border p-5 md:p-6 " +
    (highlight
      ? "border-amber-400/40 bg-amber-400/10 ring-1 ring-amber-400/30"
      : "border-neutral-800 bg-neutral-900/40");

  const ButtonInner = (
    <span className="inline-block rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm hover:bg-neutral-800">
      {cta}
    </span>
  );

  const Content = (
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
        {href ? (
          <Link href={href} aria-label={`${name} plan`}>{ButtonInner}</Link>
        ) : (
          <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className="rounded-lg disabled:opacity-60"
            aria-label={`Choose ${name}`}
          >
            {ButtonInner}
          </button>
        )}
      </div>
    </div>
  );

  return Content;
}

export default function JoinPage() {
  const supabase = useMemo(
    () =>
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const [me, setMe] = useState<Me>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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

        setMe({
          user_id: acc.user_id,
          email: acc.email,
          tier: (acc.members?.tier as Me["tier"]) ?? "access",
          status: acc.members?.status ?? "free",
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

  const startMembership = async (plan: "member" | "pro") => {
    try {
      setBusy(true);
      setError("");
      const { data } = await supabase.auth.getSession();
      const user = data?.session?.user ?? null;

      if (!user) {
        // Not signed in – send to pricing (or focus header signin)
        focusHeaderSignin();
        return;
      }

      const res = await fetch(`${API_BASE}/api/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id, email: user.email, plan }),
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

  // Derive CTAs by state
  const isLoggedOut = !loading && !me;
  const isActive = me?.status === "active";
  const onMember = me?.tier === "member" && isActive;
  const onPro = me?.tier === "pro" && isActive;

  return (
    <Container>
      <PageHeader
        title="Join TradesCard"
        subtitle="Start on Access for free. Upgrade anytime for more savings, benefits and rewards."
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

      {/* Plans */}
      <div className="grid gap-4 md:grid-cols-2">
        <PlanCard
          name="Member"
          price="£2.99/mo"
          bullets={[
            "Full offer catalogue",
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
          onClick={() => (isLoggedOut ? (window.location.href = "/pricing") : startMembership("member"))}
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
              : (me?.tier === "member" ? "Upgrade to Pro" : "Choose Pro")
          }
          disabled={onPro || busy}
          onClick={() => (isLoggedOut ? (window.location.href = "/pricing") : startMembership("pro"))}
          ribbon={onPro ? "Current" : "Best value"}
        />
      </div>

      {/* Access panel */}
      <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900/50 p-5">
        <div className="flex items-center gap-2">
          <h3 className="font-medium">Just want to look around?</h3>
          <Badge>ACCESS</Badge>
        </div>
        <p className="text-sm text-neutral-400 mt-1">
          Start free on Access. You’ll see sample offers and upgrade prompts. You can switch or cancel any time.
        </p>
        <div className="mt-3">
          <button
            onClick={focusHeaderSignin}
            className="rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm hover:bg-neutral-800"
          >
            Sign in / Join free
          </button>
        </div>
      </div>
    </Container>
  );
}