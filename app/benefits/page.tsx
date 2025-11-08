// app/benefits/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import PrimaryButton from "@/components/PrimaryButton";
import { useMe } from "@/lib/useMe";
import { routeToJoin } from "@/lib/routeToJoin";
import { shouldShowTrial, TRIAL_COPY } from "@/lib/trial";

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

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://tradescard-api.vercel.app";

const TIER_ORDER: Record<Tier, number> = { access: 0, member: 1, pro: 2 };

function Pill({
  children,
  tone = "muted",
  className = "",
}: {
  children: React.ReactNode;
  tone?: "muted" | "ok" | "warn";
  className?: string;
}) {
  const base =
    "rounded px-2 py-0.5 text-[11px] leading-none inline-flex items-center gap-1";
  const cls =
    tone === "ok"
      ? "bg-green-900/30 text-green-300"
      : tone === "warn"
      ? "bg-amber-900/30 text-amber-300"
      : "bg-neutral-800 text-neutral-300";
  return <span className={`${base} ${cls} ${className}`}>{children}</span>;
}

function TierTag({ tier }: { tier: Tier }) {
  const tone: Record<Tier, "muted" | "ok" | "warn"> = {
    access: "muted",
    member: "ok",
    pro: "warn",
  };
  return <Pill tone={tone[tier]}>{tier.toUpperCase()}</Pill>;
}

function LockIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="12" height="12" viewBox="0 0 20 20" aria-hidden {...props}>
      <path
        d="M5 9V7a5 5 0 0110 0v2h1a1 1 0 011 1v8a1 1 0 01-1 1H4a1 1 0 01-1-1v-8a1 1 0 011-1h1zm2 0h6V7a3 3 0 10-6 0v2z"
        fill="currentColor"
      />
    </svg>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 h-36 animate-pulse" />
  );
}

export default function BenefitsPage() {
  const me = useMe(); // { user?, email?, tier, status, ready }
  const showTrial = shouldShowTrial(me);

  const isActivePaid =
    !!me && me.tier !== "access" && (me.status === "active" || me.status === "trialing");
  const tierIndex: number = useMemo(
    () => TIER_ORDER[(me?.tier as Tier) ?? "access"],
    [me?.tier]
  );

  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");

  const [detail, setDetail] = useState<Benefit | null>(null);

  // Upgrade routing (no modal)
  const goUpgrade = () => {
    if (!isActivePaid) return routeToJoin("member");
    if (me?.tier === "member") return routeToJoin("pro");
  };

  useEffect(() => {
    let aborted = false;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        const res = await fetch(`${API_BASE}/api/benefits`, { cache: "no-store" });
        if (!res.ok) throw new Error(`benefits ${res.status}`);
        const list: Benefit[] = await res.json();
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
  }, []);

  // Split by eligibility
  const eligible: Benefit[] = [];
  const locked: Benefit[] = [];
  for (const b of benefits) {
    const requiredTier = (b.tier as Tier) ?? "member";
    const requiredIdx = TIER_ORDER[requiredTier];
    const ok = isActivePaid && tierIndex >= requiredIdx;
    (ok ? eligible : locked).push({ ...b, tier: requiredTier });
  }

  const onOpenHowTo = (b: Benefit) => {
    if (b.link && /^https?:\/\//i.test(b.link)) {
      window.open(b.link, "_blank", "noopener,noreferrer");
      return;
    }
    setDetail(b);
  };

  const subtitle = isActivePaid
    ? "Your membership includes the benefits below. Upgrade to unlock more."
    : "Built-in protection and support for paid members. Join to unlock benefits.";

  return (
    <Container>
      <PageHeader
        title="Benefits"
        subtitle={subtitle}
        aside={
          isActivePaid ? (
            <div className="flex items-center gap-2 text-sm">
              <TierTag tier={me!.tier as Tier} />
              <Pill tone={me!.status === "active" ? "ok" : "warn"}>{me!.status}</Pill>
            </div>
          ) : showTrial ? (
            <span className="hidden sm:inline rounded border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-xs text-amber-200">
              {TRIAL_COPY}
            </span>
          ) : null
        }
      />

      {/* Current plan banner */}
      {me && (
        <div className="mb-4 rounded-xl border border-neutral-800 bg-neutral-950 p-4 flex items-center justify-between gap-3">
          <div className="text-sm">
            <div className="font-medium">
              You’re on <span className="underline">{(me.tier as Tier).toUpperCase()}</span>.
            </div>
            <div className="text-neutral-400">
              Downgrading removes paid benefits from your plan.
            </div>
          </div>

          {me.tier !== "pro" && (
            <div className="flex items-center gap-2">
              {me.tier === "member" ? (
                <PrimaryButton onClick={goUpgrade}>Upgrade to Pro</PrimaryButton>
              ) : (
                <PrimaryButton onClick={goUpgrade}>
                  {showTrial ? TRIAL_COPY : "Become a Member"}
                </PrimaryButton>
              )}
            </div>
          )}
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
          {/* INCLUDED */}
          <section className="mb-6">
            <div className="mb-3 flex items-end justify-between gap-2">
              <h2 className="text-sm font-medium text-neutral-300">
                Included in your plan
                <span className="ml-2 text-xs text-neutral-500">({eligible.length})</span>
              </h2>
              {eligible.length === 0 && (
                <div className="text-xs text-neutral-500">
                  Become a member to unlock your first benefits.
                </div>
              )}
            </div>

            {eligible.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-3">
                {eligible.map((b) => (
                  <div
                    key={b.id}
                    className="group text-left rounded-2xl border border-neutral-800 bg-neutral-900 p-5 hover:bg-neutral-800 transition"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <TierTag tier={(b.tier as Tier) ?? "member"} />
                      <button
                        onClick={() => onOpenHowTo(b)}
                        className="text-xs text-neutral-400 underline group-hover:text-neutral-300"
                      >
                        How to use
                      </button>
                    </div>
                    <div className="font-semibold">{b.title}</div>
                    {b.description && (
                      <div className="mt-1 text-sm text-neutral-400">{b.description}</div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 text-sm text-neutral-400">
                No active benefits in your current plan.
              </div>
            )}
          </section>

          {/* UPGRADE */}
          <section>
            <div className="mb-3 flex items-end justify-between gap-2">
              <h2 className="text-sm font-medium text-neutral-300">
                Upgrade to unlock
                <span className="ml-2 text-xs text-neutral-500">({locked.length})</span>
              </h2>
              {locked.length > 0 && (
                <button
                  onClick={goUpgrade}
                  className="text-sm underline underline-offset-4 hover:opacity-90"
                >
                  {!isActivePaid ? "Become a Member" : "Upgrade to Pro"}
                </button>
              )}
            </div>

            {locked.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-3">
                {locked.map((b) => {
                  const required = (b.tier as Tier) ?? "member";
                  const nextCta =
                    me?.tier === "member" && required === "pro"
                      ? "Upgrade to Pro"
                      : !isActivePaid
                      ? "Join to unlock"
                      : "Upgrade to unlock";

                  return (
                    <div
                      key={b.id}
                      className="relative rounded-2xl border border-neutral-800 bg-neutral-950/60 p-5"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <TierTag tier={required} />
                        <Pill tone="muted">
                          <LockIcon /> Locked
                        </Pill>
                      </div>
                      <div className="font-semibold">{b.title}</div>
                      {b.description && (
                        <div className="mt-1 text-sm text-neutral-400">{b.description}</div>
                      )}
                      <div className="mt-3">
                        {nextCta === "Upgrade to Pro" ? (
                          <PrimaryButton onClick={goUpgrade}>Upgrade to Pro</PrimaryButton>
                        ) : nextCta === "Join to unlock" ? (
                          <PrimaryButton onClick={() => routeToJoin("member")}>
                            {showTrial ? TRIAL_COPY : "Join to unlock"}
                          </PrimaryButton>
                        ) : (
                          <button
                            onClick={goUpgrade}
                            className="text-sm underline underline-offset-4 hover:opacity-90"
                          >
                            {nextCta}
                          </button>
                        )}
                      </div>
                      <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-neutral-800/60" />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 text-sm text-neutral-400">
                Nothing else to unlock in your tier.
              </div>
            )}
          </section>

          {/* Join nudge if totally free and nothing included */}
          {eligible.length === 0 && !isActivePaid && (
            <div className="mt-6 rounded-xl border border-amber-400/30 bg-amber-400/10 p-5">
              <div className="font-medium mb-1">Benefits are for paid members</div>
              <p className="text-sm text-neutral-200">
                Join as <span className="font-semibold">Member</span> for core protection and
                support, or go <span className="font-semibold">Pro</span> for more.
              </p>
              <PrimaryButton
                onClick={() => routeToJoin("member")}
                className="mt-3"
              >
                {showTrial ? TRIAL_COPY : "See membership options"}
              </PrimaryButton>
            </div>
          )}
        </>
      )}

      {/* Simple detail drawer for “How to use” */}
      {detail && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
        >
          <button
            aria-label="Close"
            onClick={() => setDetail(null)}
            className="absolute inset-0 bg-black/60"
          />
          <div className="relative w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold">{detail.title}</h3>
              <button
                onClick={() => setDetail(null)}
                className="rounded px-2 py-1 text-sm bg-neutral-800 hover:bg-neutral-700"
              >
                Close
              </button>
            </div>
            {detail.description && (
              <p className="text-sm text-neutral-300">{detail.description}</p>
            )}
            <div className="mt-4">
              {detail.link ? (
                <a
                  href={detail.link}
                  target={/^https?:\/\//i.test(detail.link) ? "_blank" : undefined}
                  rel={/^https?:\/\//i.test(detail.link) ? "noopener noreferrer" : undefined}
                  className="inline-block rounded bg-neutral-200 text-neutral-900 text-sm px-3 py-2"
                >
                  Open instructions
                </a>
              ) : (
                <div className="text-sm text-neutral-400">
                  No instructions link available yet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Container>
  );
}