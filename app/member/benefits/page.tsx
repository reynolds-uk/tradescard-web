// app/member/benefits/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import PrimaryButton from "@/components/PrimaryButton";
import { useMe } from "@/lib/useMe";
import { useMeReady } from "@/lib/useMeReady";
import { routeToJoin } from "@/lib/routeToJoin";

type Tier = "access" | "member" | "pro";

type Benefit = {
  id: string;
  title: string;
  description: string;
  tier: Tier;
};

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://tradescard-api.vercel.app";

export default function MemberBenefitsPage() {
  const me = useMe();
  const ready = useMeReady();

  const tier: Tier = (me?.tier as Tier) ?? "access";
  const isPaid =
    (tier === "member" || tier === "pro") &&
    (me?.status === "active" || me?.status === "trialing");

  // If user somehow isn’t paid (e.g., stale cookie)
  useEffect(() => {
    if (ready && !isPaid) {
      window.location.replace("/benefits");
    }
  }, [ready, isPaid]);

  const subtitle = useMemo(() => {
    if (!ready) return "Loading…";
    if (tier === "pro") return "Your Pro benefits are listed below.";
    return "Your Member benefits are listed below. Upgrade to Pro for more.";
  }, [ready, tier]);

  // -----------------------------
  // Fetch benefits for paid users
  // -----------------------------
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");
  const [benefits, setBenefits] = useState<Benefit[]>([]);

  useEffect(() => {
    if (!ready || !isPaid) return;

    let aborted = false;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const candidates = [
          `${API_BASE}/api/benefits`,
          `${API_BASE}/api/members/benefits`,
        ];

        let got: Benefit[] = [];
        for (const url of candidates) {
          try {
            const res = await fetch(url, { cache: "no-store" });
            if (!res.ok) continue;
            const json = await res.json();
            if (Array.isArray(json)) {
              got = json;
              break;
            }
            if (Array.isArray(json?.benefits)) {
              got = json.benefits;
              break;
            }
          } catch {
            // try next
          }
        }

        // Fallback demo data
        if (!got.length) {
          got = [
            {
              id: "protect-lite",
              title: "Protect Lite",
              description: "Purchase protection and dispute help on eligible redemptions.",
              tier: "member",
            },
            {
              id: "priority-support",
              title: "Priority Support",
              description: "Faster help when you need us most.",
              tier: "member",
            },
            {
              id: "early-access",
              title: "Early-access deals",
              description: "Get first dibs on limited-quantity offers.",
              tier: "pro",
            },
          ];
        }

        if (!aborted) setBenefits(got);
      } catch (e) {
        if (!aborted) setErr(e instanceof Error ? e.message : "Couldn’t load benefits.");
      } finally {
        if (!aborted) setLoading(false);
      }
    })();

    return () => {
      aborted = true;
    };
  }, [ready, isPaid]);

  const visibleBenefits = useMemo(
    () => benefits.filter((b) => tier === "pro" || b.tier === "member"),
    [benefits, tier]
  );

  return (
    <Container>
      <PageHeader title="Benefits" subtitle={subtitle} />

      {err && (
        <div className="mb-4 rounded border border-red-600/40 bg-red-900/10 p-3 text-red-300 text-sm">
          {err}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading && (
          <div className="text-neutral-400 text-sm">Loading your benefits…</div>
        )}

        {!loading && visibleBenefits.length === 0 && (
          <div className="text-neutral-400 text-sm">
            No active benefits found for your plan.
          </div>
        )}

        {visibleBenefits.map((b) => (
          <div
            key={b.id}
            className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4"
          >
            <div className="text-sm font-semibold mb-1">{b.title}</div>
            <p className="text-neutral-400 text-sm">{b.description}</p>
          </div>
        ))}
      </div>

      {tier === "member" && (
        <div className="mt-6 flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
          <div className="text-sm text-neutral-300">
            Unlock Pro-only benefits such as early-access deals.
          </div>
          <PrimaryButton onClick={() => routeToJoin("pro")}>Upgrade to Pro</PrimaryButton>
        </div>
      )}
    </Container>
  );
}