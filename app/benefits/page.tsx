"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";

type Tier = "access" | "member" | "pro";
type Benefit = {
  id: string;
  title: string;
  description?: string | null;
  tier?: Tier | string;
  link?: string | null;
  is_active?: boolean;
  priority?: number;
};

type Me = {
  user_id: string;
  email: string;
  tier: Tier;
  status: string;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://tradescard-api.vercel.app";

const TIER_ORDER: Record<Tier, number> = { access: 0, member: 1, pro: 2 };

function Pill({
  children,
  tone = "muted",
}: {
  children: React.ReactNode;
  tone?: "muted" | "ok" | "warn";
}) {
  const cls =
    tone === "ok"
      ? "bg-green-900/30 text-green-300"
      : tone === "warn"
      ? "bg-amber-900/30 text-amber-300"
      : "bg-neutral-800 text-neutral-300";
  return <span className={`rounded px-2 py-0.5 text-[11px] ${cls}`}>{children}</span>;
}

function TierTag({ tier }: { tier: Tier }) {
  const tone: Record<Tier, "muted" | "ok" | "warn"> = {
    access: "muted",
    member: "ok",
    pro: "warn",
  };
  return <Pill tone={tone[tier]}>{tier.toUpperCase()}</Pill>;
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 h-36 animate-pulse" />
  );
}

export default function BenefitsPage() {
  const supabase = useMemo(
    () => createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ),
    []
  );

  const [me, setMe] = useState<Me | null>(null);
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");

  const isActivePaid = !!me && me.tier !== "access" && (me.status === "active" || me.status === "trialing");
  const tierIndex = me ? TIER_ORDER[me.tier] : 0;

  useEffect(() => {
    let aborted = false;

    (async () => {
      setLoading(true);
      setErr("");
      try {
        // session → account (tier/status)
        const { data } = await supabase.auth.getSession();
        const user = data?.session?.user ?? null;
        if (user) {
          const r = await fetch(`${API_BASE}/api/account?user_id=${encodeURIComponent(user.id)}`, { cache: "no-store" });
          if (r.ok) {
            const a = await r.json();
            const t = (a?.members?.tier as Tier) ?? "access";
            const s = a?.members?.status ?? (t === "access" ? "free" : "inactive");
            if (!aborted) {
              setMe({
                user_id: a?.user_id ?? user.id,
                email: a?.email,
                tier: t,
                status: s,
              });
            }
          } else if (!aborted) {
            setMe(null);
          }
        } else if (!aborted) {
          setMe(null);
        }

        // benefits catalogue
        const b = await fetch(`${API_BASE}/api/benefits`, { cache: "no-store" });
        if (!b.ok) throw new Error(`benefits ${b.status}`);
        const list: Benefit[] = await b.json();

        // sort: priority desc, then title
        const sorted = [...list].sort((a, b) => {
          const ap = a.priority ?? 0;
          const bp = b.priority ?? 0;
          if (ap !== bp) return bp - ap;
          return (a.title || "").localeCompare(b.title || "");
        });

        if (!aborted) setBenefits(sorted);
      } catch (e) {
        if (!aborted) setErr(e instanceof Error ? e.message : "Something went wrong");
      } finally {
        if (!aborted) setLoading(false);
      }
    })();

    return () => {
      aborted = true;
    };
  }, [supabase]);

  // Split by eligibility
  const eligible: Benefit[] = [];
  const locked: Benefit[] = [];
  for (const b of benefits) {
    const required = TIER_ORDER[(b.tier as Tier) ?? "member"];
    const ok = isActivePaid && tierIndex >= required;
    (ok ? eligible : locked).push(b);
  }

  const handleEligibleClick = (b: Benefit) => {
    if (!b.link) return;
    const ext = /^https?:\/\//i.test(b.link);
    if (ext) window.open(b.link, "_blank", "noopener,noreferrer");
    else window.location.href = b.link;
  };

  const showUpgradeBar =
    !me || me.tier === "access" || (me.tier === "member" && me.status !== "canceled");

  return (
    <Container>
      <PageHeader
        title="Benefits"
        subtitle={
          isActivePaid
            ? "Your membership includes the benefits below. Upgrade to unlock more."
            : "Built-in protection and support for paid members. Join to unlock benefits."
        }
        aside={
          isActivePaid ? (
            <div className="flex items-center gap-2 text-sm">
              <TierTag tier={me!.tier} />
              <Pill tone={me!.status === "active" ? "ok" : "warn"}>{me!.status}</Pill>
            </div>
          ) : null
        }
      />

      {/* Current plan banner + downgrade warning */}
      {me && (
        <div className="mb-4 rounded-xl border border-neutral-800 bg-neutral-950 p-4 flex items-center justify-between gap-3">
          <div className="text-sm">
            <div className="font-medium">
              You’re on <span className="underline">{me.tier.toUpperCase()}</span>.
            </div>
            <div className="text-neutral-400">
              Downgrading will remove {me.tier !== "access" ? me.tier : "paid"} benefits.
            </div>
          </div>
          <div className="flex gap-2">
            {me.tier === "member" && (
              <a
                href="/account#upgrade"
                className="rounded bg-amber-400/90 text-black px-3 py-2 text-sm hover:bg-amber-400"
              >
                Upgrade to Pro
              </a>
            )}
            {me.tier === "access" && (
              <a
                href="/join"
                className="rounded bg-amber-400/90 text-black px-3 py-2 text-sm hover:bg-amber-400"
              >
                Become a Member
              </a>
            )}
          </div>
        </div>
      )}

      {err && (
        <div className="mb-4 rounded border border-red-600/40 bg-red-900/10 p-3 text-red-300">
          {err}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {!loading && (
        <>
          {/* INCLUDED SECTION */}
          {eligible.length > 0 && (
            <section className="mb-6">
              <h2 className="mb-3 text-sm font-medium text-neutral-300">Included in your plan</h2>
              <div className="grid gap-4 md:grid-cols-3">
                {eligible.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => handleEligibleClick(b)}
                    className="group text-left rounded-2xl border border-neutral-800 bg-neutral-900 p-5 hover:bg-neutral-800 transition"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <TierTag tier={(b.tier as Tier) ?? "member"} />
                      <span className="text-xs text-neutral-400 underline group-hover:text-neutral-300">
                        How to use
                      </span>
                    </div>
                    <div className="font-semibold">{b.title}</div>
                    {b.description && (
                      <div className="mt-1 text-sm text-neutral-400">{b.description}</div>
                    )}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* UPGRADE SECTION */}
          {locked.length > 0 && (
            <section>
              <div className="mb-3 flex items-end justify-between gap-2">
                <h2 className="text-sm font-medium text-neutral-300">Upgrade to unlock</h2>
                {showUpgradeBar && (
                  <a
                    href={me?.tier === "member" ? "/account#upgrade" : "/join"}
                    className="text-sm underline underline-offset-4 hover:opacity-90"
                  >
                    {me?.tier === "member" ? "Upgrade to Pro" : "Become a Member"}
                  </a>
                )}
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {locked.map((b) => {
                  const required = (b.tier as Tier) ?? "member";
                  const nextCta =
                    me?.tier === "member" && required === "pro"
                      ? "Upgrade to Pro"
                      : me?.tier === "access" || !me
                      ? "Join to unlock"
                      : "Upgrade to unlock";

                  return (
                    <div
                      key={b.id}
                      className="relative rounded-2xl border border-neutral-800 bg-neutral-950/60 p-5"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <TierTag tier={required} />
                        <Pill tone="muted">Locked</Pill>
                      </div>
                      <div className="font-semibold">{b.title}</div>
                      {b.description && (
                        <div className="mt-1 text-sm text-neutral-400">{b.description}</div>
                      )}
                      <div className="mt-3">
                        <a
                          href={me?.tier === "member" ? "/account#upgrade" : "/join"}
                          className="text-sm underline underline-offset-4 hover:opacity-90"
                        >
                          {nextCta}
                        </a>
                      </div>
                      <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-neutral-800/60" />
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* If nothing eligible and user is free → big nudge */}
          {eligible.length === 0 && (!me || me.tier === "access") && (
            <div className="mt-6 rounded-xl border border-amber-400/30 bg-amber-400/10 p-5">
              <div className="font-medium mb-1">Benefits are for paid members</div>
              <p className="text-sm text-neutral-200">
                Join as <span className="font-semibold">Member</span> for core protection and
                support, or go <span className="font-semibold">Pro</span> for more.
              </p>
              <a
                href="/join"
                className="mt-3 inline-block rounded bg-amber-400 text-black px-4 py-2 font-medium"
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