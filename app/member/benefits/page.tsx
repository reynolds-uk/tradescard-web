// app/member/benefits/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import PrimaryButton from "@/components/PrimaryButton";
import { useMe } from "@/lib/useMe";
import { useMeReady } from "@/lib/useMeReady";
import { routeToJoin } from "@/lib/routeToJoin";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowserClient";

type Tier = "access" | "member" | "pro";
type AppStatus = "free" | "trial" | "paid" | "inactive";
const isActiveStatus = (s?: string) => s === "paid" || s === "trial";

type Benefit = {
  id: string;
  title: string;
  description: string | null;
  tier: Tier;
  is_active?: boolean;
  priority?: number;
};

export default function MemberBenefitsPage() {
  const router = useRouter();
  const me = useMe();
  const ready = useMeReady();

  const tier: Tier = (me?.tier as Tier) ?? "access";
  const status: AppStatus = (me?.status as AppStatus) ?? "free";

  const isPaid = (tier === "member" || tier === "pro") && isActiveStatus(status);

  // If not on an active paid plan (stale cookie etc.), bounce to public preview
  useEffect(() => {
    if (!ready) return;
    if (!isPaid) router.replace("/benefits");
  }, [ready, isPaid, router]);

  const subtitle = !ready
    ? "Loading…"
    : tier === "pro"
    ? "Your Pro benefits are listed below."
    : "Your Member benefits are listed below. Upgrade to Pro for more.";

  // ──────────────────────────────────────────────────────
  // Fetch benefits directly from Supabase (active only)
  // ──────────────────────────────────────────────────────
  const supabase = useMemo(getSupabaseBrowserClient, []);

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
  const visibleBenefits = useMemo(
    () => benefits.filter((b) => (tier === "pro" ? true : b.tier !== "pro")),
    [benefits, tier]
  );

  if (ready && !isPaid) {
    // Calm state while redirecting
    return (
      <Container>
        <PageHeader title="Benefits" subtitle="Taking you to the public benefits view…" />
      </Container>
    );
  }

  return (
    <Container>
      <PageHeader title="Benefits" subtitle={subtitle} />

      {err && (
        <div
          className="mb-4 rounded border border-red-600/40 bg-red-900/10 p-3 text-red-300 text-sm"
          role="alert"
        >
          {err}
        </div>
      )}

      {loading && <div className="text-neutral-400 text-sm">Loading your benefits…</div>}

      {!loading && visibleBenefits.length === 0 && (
        <div className="text-neutral-400 text-sm">No active benefits found for your plan.</div>
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
          <PrimaryButton onClick={() => routeToJoin("pro")}>Upgrade to Pro</PrimaryButton>
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
