// app/benefits/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";

type Benefit = {
  id: string;
  title: string;
  description?: string | null;
  tier?: "access" | "member" | "pro" | string;
  link?: string | null;
  is_active?: boolean;
  priority?: number;
};

type Me = {
  user_id: string;
  email: string;
  tier: "access" | "member" | "pro";
  status: string;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://tradescard-api.vercel.app";

const TIER_ORDER: Record<NonNullable<Benefit["tier"]>, number> = {
  access: 0,
  member: 1,
  pro: 2,
};

function TierPill({ tier }: { tier: string | undefined }) {
  const t = (tier ?? "member").toUpperCase();
  return (
    <span className="rounded bg-neutral-800 px-2 py-0.5 text-[11px] tracking-wide">
      {t}
    </span>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5 animate-pulse h-36" />
  );
}

export default function BenefitsPage() {
  const supabase = useMemo(
    () =>
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const [me, setMe] = useState<Me | null>(null);
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");

  const isPaidActive = me && me.tier !== "access" && me.status === "active";
  const userTierIdx = me ? TIER_ORDER[me.tier] : TIER_ORDER["access"];

  useEffect(() => {
    let aborted = false;

    async function load() {
      setLoading(true);
      setErr("");

      try {
        // Who am I?
        const { data } = await supabase.auth.getSession();
        const user = data?.session?.user ?? null;

        let tier: Me["tier"] = "access";
        let status = "free";
        if (user) {
          const accRes = await fetch(
            `${API_BASE}/api/account?user_id=${encodeURIComponent(user.id)}`,
            { cache: "no-store" }
          );
          if (accRes.ok) {
            const a = await accRes.json();
            tier = (a?.members?.tier as Me["tier"]) ?? "access";
            status = a?.members?.status ?? "free";
            if (!aborted) {
              setMe({
                user_id: a?.user_id ?? user.id,
                email: a?.email,
                tier,
                status,
              });
            }
          } else if (!aborted) {
            setMe(null);
          }
        } else if (!aborted) {
          setMe(null);
        }

        // Fetch benefits catalogue
        const res = await fetch(`${API_BASE}/api/benefits`, { cache: "no-store" });
        if (!res.ok) throw new Error(`benefits ${res.status}`);
        const list: Benefit[] = await res.json();

        // Sort & (optionally) filter
        const sorted = [...list].sort((a, b) => {
          const pa = b.priority ?? 0;
          const pb = a.priority ?? 0;
          if (pa !== pb) return pa - pb; // desc
          return (a.title || "").localeCompare(b.title || "");
        });

        // For free/inactive accounts we still show the full list,
        // but “locked” those above their tier (better for conversion).
        if (!aborted) setBenefits(sorted);
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

  const handleClick = (b: Benefit) => {
    const requiredIdx = TIER_ORDER[(b.tier as keyof typeof TIER_ORDER) ?? "member"];
    const eligible = isPaidActive && userTierIdx >= requiredIdx;

    if (eligible && b.link) {
      const isExternal = /^https?:\/\//i.test(b.link);
      if (isExternal) window.open(b.link, "_blank", "noopener,noreferrer");
      else window.location.href = b.link!;
      return;
    }

    // Not eligible → send to join/upgrade
    window.location.href = "/join";
  };

  return (
    <Container>
      <PageHeader
        title="Benefits"
        subtitle="Built-in protection and support for paid members. Upgrade tier to unlock more."
      />

      {err && (
        <div className="mb-4 rounded border border-red-600/40 bg-red-900/10 p-3 text-red-300">
          {err}
        </div>
      )}

      {/* Cards */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <>
          {benefits.length === 0 ? (
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5 text-neutral-400">
              No benefits to show yet. Check back soon.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {benefits.map((b) => {
                const requiredIdx =
                  TIER_ORDER[(b.tier as keyof typeof TIER_ORDER) ?? "member"];
                const eligible = isPaidActive && userTierIdx >= requiredIdx;

                return (
                  <button
                    key={b.id}
                    onClick={() => handleClick(b)}
                    className={`group relative rounded-2xl border p-5 text-left transition
                      ${eligible
                        ? "border-neutral-800 bg-neutral-900 hover:bg-neutral-800"
                        : "border-neutral-800 bg-neutral-950/60 hover:bg-neutral-900/60"}`}
                  >
                    {/* Tier */}
                    <div className="mb-2 flex items-center justify-between">
                      <TierPill tier={(b.tier as string) ?? "member"} />
                      {!eligible && (
                        <span className="rounded bg-neutral-900 px-2 py-0.5 text-[11px] text-neutral-400">
                          Locked
                        </span>
                      )}
                    </div>

                    <div className="text-base font-semibold">{b.title}</div>
                    {b.description && (
                      <div className="mt-1 text-sm text-neutral-400">{b.description}</div>
                    )}

                    <div className="mt-3 text-sm">
                      <span
                        className={`underline underline-offset-2 ${
                          eligible ? "text-neutral-200" : "text-neutral-400"
                        }`}
                      >
                        {eligible ? "How to use" : "Upgrade to unlock"}
                      </span>
                    </div>

                    {/* subtle lock overlay */}
                    {!eligible && (
                      <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-neutral-800/60 group-hover:ring-neutral-700/60" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Upgrade prompt for non-eligible users */}
          {(!me || me.tier === "access" || me.status !== "active") && (
            <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
              <div className="font-medium mb-1">Benefits are for paid members.</div>
              <p className="text-neutral-300">
                Upgrade to <span className="font-medium">Member</span> or{" "}
                <span className="font-medium">Pro</span> to unlock breakdown cover,
                wellbeing support and more.
              </p>
              <a
                href="/join"
                className="mt-3 inline-block rounded-lg bg-amber-400 px-4 py-2 font-medium text-black"
              >
                See membership options
              </a>
            </div>
          )}
        </>
      )}
    </Container>
  );
}