// app/member/benefits/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://tradescard-api.vercel.app";

type Benefit = {
  id: string;
  title: string;
  description?: string | null;
  tier: "member" | "pro";
  link?: string | null;
  priority: number;
};

type Me = {
  user_id: string;
  email: string;
  tier: "access" | "member" | "pro";
  status: string;
};

const TIER_ORDER: Record<"access" | "member" | "pro", number> = {
  access: 0,
  member: 1,
  pro: 2,
};

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded bg-neutral-800 px-2 py-0.5 text-[11px] tracking-wide">
      {children}
    </span>
  );
}

function SkeletonCard() {
  return (
    <div className="h-36 rounded-2xl border border-neutral-800 bg-neutral-900 animate-pulse" />
  );
}

export default function MemberBenefits() {
  const supabase = useMemo(
    () =>
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const [me, setMe] = useState<Me | null>(null);
  const [items, setItems] = useState<Benefit[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");

  const isPaidActive = me && me.tier !== "access" && me.status === "active";
  const userTierIdx = me ? TIER_ORDER[me.tier] : TIER_ORDER["access"];

  useEffect(() => {
    let aborted = false;

    async function load() {
      try {
        setLoading(true);
        setErr("");

        // who am I?
        const { data } = await supabase.auth.getSession();
        const user = data?.session?.user ?? null;

        if (!user) {
          setMe(null);
        } else {
          const a = await fetch(
            `${API_BASE}/api/account?user_id=${encodeURIComponent(user.id)}`,
            { cache: "no-store" }
          );
          if (a.ok) {
            const j = await a.json();
            const tier = (j?.members?.tier as Me["tier"]) ?? "access";
            const status = j?.members?.status ?? "free";
            if (!aborted) {
              setMe({
                user_id: j?.user_id ?? user.id,
                email: j?.email ?? user.email ?? "",
                tier,
                status,
              });
            }
          } else if (!aborted) {
            setMe(null);
          }
        }

        // catalogue
        const res = await fetch(`${API_BASE}/api/benefits`, { cache: "no-store" });
        if (!res.ok) throw new Error(`benefits ${res.status}`);
        const data: Benefit[] = await res.json();

        // sort by priority desc then title
        const sorted = [...data].sort((a, b) => {
          const byPrio = (b.priority ?? 0) - (a.priority ?? 0);
          if (byPrio !== 0) return byPrio;
          return (a.title || "").localeCompare(b.title || "");
        });

        if (!aborted) setItems(sorted);
      } catch (e) {
        if (!aborted) setErr(e instanceof Error ? e.message : "Something went wrong");
      } finally {
        if (!aborted) setLoading(false);
      }
    }

    load();
    return () => {
      aborted = true;
    };
  }, [supabase]);

  const eligibleFor = (b: Benefit) => {
    const requiredIdx = TIER_ORDER[b.tier === "pro" ? "pro" : "member"];
    return Boolean(isPaidActive && userTierIdx >= requiredIdx);
  };

  const handleClick = (b: Benefit) => {
    const canUse = eligibleFor(b);
    if (canUse && b.link) {
      if (/^https?:\/\//i.test(b.link)) window.open(b.link, "_blank", "noopener,noreferrer");
      else window.location.href = b.link!;
      return;
    }
    // member but locked (i.e. needs Pro) → send to account to upgrade
    window.location.href = "/account";
  };

  const lockedCount =
    items.filter((b) => b.tier === "pro").length -
    items.filter((b) => b.tier === "pro" && eligibleFor(b)).length;

  return (
    <Container>
      <div className="mb-4 flex items-end justify-between gap-3">
        <PageHeader
          title="Member Benefits"
          subtitle="Included protection and support for paid members."
        />
        {me && (
          <div className="text-sm text-neutral-500">
            <Pill>{me.tier.toUpperCase()}</Pill>
            <span className="mx-1" />
            <span
              className={`rounded px-2 py-0.5 text-[11px] ${
                me.status === "active"
                  ? "bg-green-900/30 text-green-300"
                  : me.status === "trialing"
                  ? "bg-amber-900/30 text-amber-300"
                  : "bg-neutral-800 text-neutral-300"
              }`}
            >
              {me.status}
            </span>
          </div>
        )}
      </div>

      {err && (
        <div className="mb-4 rounded border border-red-600/40 bg-red-900/10 p-3 text-red-300">
          {err}
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5 text-neutral-400">
          No active benefits available.
        </div>
      ) : (
        <>
          {/* upgrade hint for Member users if Pro items exist */}
          {me?.tier === "member" && lockedCount > 0 && (
            <div className="mb-4 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-amber-200">
              Unlock <b>{lockedCount}</b> extra benefit{lockedCount > 1 ? "s" : ""} with{" "}
              <b>Pro</b>. Manage or upgrade from your <a className="underline" href="/account">Account</a>.
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            {items.map((b) => {
              const canUse = eligibleFor(b);
              return (
                <button
                  key={b.id}
                  onClick={() => handleClick(b)}
                  className={`group text-left rounded-2xl border p-5 transition
                    ${
                      canUse
                        ? "border-neutral-800 bg-neutral-900 hover:bg-neutral-800"
                        : "border-neutral-800 bg-neutral-950/60 hover:bg-neutral-900/60"
                    }`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <Pill>{b.tier.toUpperCase()}</Pill>
                    {!canUse && (
                      <span className="rounded bg-neutral-900 px-2 py-0.5 text-[11px] text-neutral-400">
                        Locked
                      </span>
                    )}
                  </div>

                  <div className="text-base font-semibold">{b.title}</div>
                  {b.description && (
                    <p className="mt-1 text-sm text-neutral-400">{b.description}</p>
                  )}

                  <div className="mt-3 text-sm">
                    <span
                      className={`underline underline-offset-2 ${
                        canUse ? "text-neutral-200" : "text-neutral-400"
                      }`}
                    >
                      {canUse ? "How to use" : "Upgrade to unlock"}
                    </span>
                  </div>

                  {!canUse && (
                    <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-neutral-800/60 group-hover:ring-neutral-700/60" />
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </Container>
  );
}