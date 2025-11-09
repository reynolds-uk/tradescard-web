// app/member/benefits/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
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
  description: string | null;
  tier: Tier;
  is_active?: boolean;
  priority?: number;
};

export default function MemberBenefitsPage() {
  const me = useMe();
  const ready = useMeReady();

  const tier: Tier = (me?.tier as Tier) ?? "access";
  const isPaid =
    (tier === "member" || tier === "pro") &&
    (me?.status === "active" || me?.status === "trialing");

  // If somehow not paid (stale cookie etc.), bounce to public preview
  useEffect(() => {
    if (!ready) return;
    if (!isPaid) window.location.replace("/benefits");
  }, [ready, isPaid]);

  const subtitle =
    !ready
      ? "Loading…"
      : tier === "pro"
      ? "Your Pro benefits are listed below."
      : "Your Member benefits are listed below. Upgrade to Pro for more.";

  // ──────────────────────────────────────────────────────
  // Fetch benefits directly from Supabase (active only)
  // ──────────────────────────────────────────────────────
  const supabase = useMemo(
    () =>
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

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
        // Pull all active benefits and order by priority (desc), then title
        const { data, error } = await supabase
          .from("benefits")
          .select("id,title,description,tier,is_active,priority")
          .eq("is_active", true)
          .order("priority", { ascending: false })
          .order("title", { ascending: true });

        if (error) throw error;

        // Guard against nulls
        const rows: Benefit[] = (data ?? []).map((b: any) => ({
          id: b.id,
          title: b.title,
          description: b.description ?? null,
          tier: (b.tier as Tier) || "member",
          is_active: b.is_active,
          priority: b.priority ?? 0,
        }));

        if (!aborted) setBenefits(rows);
      } catch (e: any) {
        if (!aborted) setErr(e?.message || "Couldn’t load benefits.");
      } finally {
        if (!aborted) setLoading(false);
      }
    })();

    return () => {
      aborted = true;
    };
  }, [ready, isPaid, supabase]);

  // Only show benefits the user’s tier unlocks
  const visibleBenefits = useMemo(() => {
    return benefits.filter((b) => (tier === "pro" ? true : b.tier !== "pro"));
  }, [benefits, tier]);

  return (
    <Container>
      <PageHeader title="Benefits" subtitle={subtitle} />

      {err && (
        <div className="mb-4 rounded border border-red-600/40 bg-red-900/10 p-3 text-red-300 text-sm">
          {err}
        </div>
      )}

      {loading && (
        <div className="text-neutral-400 text-sm">Loading your benefits…</div>
      )}

      {!loading && visibleBenefits.length === 0 && (
        <div className="text-neutral-400 text-sm">
          No active benefits found for your plan.
        </div>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleBenefits.map((b) => (
          <BenefitCard key={b.id} benefit={b} tier={tier} />
        ))}
      </div>

      {tier === "member" && (
        <div className="mt-6 flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
          <div className="text-sm text-neutral-300">
            Unlock Pro-only benefits such as early access and Pro-exclusive offers.
          </div>
          <PrimaryButton onClick={() => routeToJoin("pro")}>
            Upgrade to Pro
          </PrimaryButton>
        </div>
      )}
    </Container>
  );
}

/* ──────────────────────────────
   Components
   ────────────────────────────── */

function BenefitCard({ benefit, tier }: { benefit: Benefit; tier: Tier }) {
  const proOnly = benefit.tier === "pro";
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="text-sm font-semibold">{benefit.title}</div>
        {proOnly ? (
          <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[11px] text-amber-300">
            Pro only
          </span>
        ) : (
          <span className="rounded-full border border-neutral-700 bg-neutral-800/60 px-2 py-0.5 text-[11px] text-neutral-300">
            Included
          </span>
        )}
      </div>
      {benefit.description && (
        <p className="text-neutral-400 text-sm">{benefit.description}</p>
      )}
      {proOnly && tier === "member" && (
        <div className="mt-3 text-xs text-neutral-500">
          Upgrade to Pro to unlock this benefit.
        </div>
      )}
    </div>
  );
}