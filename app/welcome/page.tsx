// app/welcome/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

import Container from "@/components/Container";
import PageHeader from "@/components/PageHeader";
import PrimaryButton from "@/components/PrimaryButton";
import { useMe } from "@/lib/useMe";
import { shouldShowTrial, TRIAL_COPY } from "@/lib/trial";
import { track } from "@/lib/track";

type Tier = "access" | "member" | "pro";

const TIER_COPY: Record<Tier, { label: string; blurb: string }> = {
  access: {
    label: "ACCESS",
    blurb:
      "You can browse and redeem public offers. Upgrade any time to unlock benefits and monthly rewards.",
  },
  member: {
    label: "MEMBER",
    blurb:
      "You’ve unlocked core benefits and monthly rewards entries. Explore offers and start saving today.",
  },
  pro: {
    label: "PRO",
    blurb:
      "You’ve unlocked all benefits, early-access deals and the highest monthly rewards entries.",
  },
};

export default function WelcomePage() {
  const me = useMe(); // { ready, user?, tier?, status? }
  const user = me.user;
  const tier: Tier = (me.tier as Tier) ?? "access";

  const supabase = useMemo(
    () =>
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  // Form state
  const [name, setName] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [savedOnce, setSavedOnce] = useState(false);
  const [error, setError] = useState<string>("");

  // UI helpers
  const [copied, setCopied] = useState(false);
  const showTrial = shouldShowTrial(me as any);
  const accessCta = showTrial ? TRIAL_COPY : "Become a Member (£2.99/mo)";

  // Pre-fill from DB if the user exists
  useEffect(() => {
    if (!user?.id) return;

    let aborted = false;
    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("name, phone")
        .eq("user_id", user.id)
        .single();

      if (!aborted && !error && data) {
        setName(data.name ?? "");
        // phone column may be newly added — handle undefined gracefully
        setPhone((data as any).phone ?? "");
      }
    })();

    return () => {
      aborted = true;
    };
  }, [user?.id, supabase]);

  function maskedId(id?: string) {
    return id ? `${id.slice(0, 6)}…${id.slice(-4)}` : "—";
  }

  function goJoin(plan: "member" | "pro") {
    try {
      localStorage.setItem("join_wanted_plan", plan);
    } catch {}
    track("welcome_cta_join_member", { plan, trial: showTrial });
    window.location.href = "/join";
  }

  async function copyCardId() {
    if (!user?.id) return;
    try {
      await navigator.clipboard.writeText(user.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* no-op */
    }
  }

  // Basic UK-ish phone validator (lenient)
  const isValidPhone = (v: string) => {
    const s = v.replace(/[\s\-\(\)]/g, "");
    return /^(\+?\d{10,15})$/.test(s);
  };

  async function saveAndContinue() {
    if (!user?.id) return;

    setError("");
    if ((tier === "member" || tier === "pro") && !isValidPhone(phone)) {
      setError("Please enter a valid phone number so we can contact you about rewards.");
      return;
    }

    setSaving(true);
    try {
      const { error: upErr } = await supabase
        .from("profiles")
        .update({
          name: name || null,
          // phone column assumed present via migration
          phone: phone || null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (upErr) throw upErr;

      setSavedOnce(true);
      track("welcome_profile_saved", { tier, has_phone: !!phone });

      if (tier === "access") window.location.href = "/offers";
      else window.location.href = "/account";
    } catch (e: any) {
      setError(e?.message || "We couldn’t save your details just now.");
    } finally {
      setSaving(false);
    }
  }

  function skipForNow() {
    track("welcome_skip", { tier });
    if (tier === "access") window.location.href = "/offers";
    else window.location.href = "/account";
  }

  return (
    <Container>
      <PageHeader
        title="Welcome to TradeCard"
        subtitle="Here’s your card and a quick setup so we can serve you properly."
        aside={
          showTrial ? (
            <span className="hidden sm:inline rounded bg-amber-400/20 text-amber-200 text-xs px-2 py-1 border border-amber-400/30">
              {TRIAL_COPY}
            </span>
          ) : undefined
        }
      />

      {showTrial && (
        <div className="mb-4 rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-200">
          Limited-time offer: {TRIAL_COPY}
        </div>
      )}

      {/* Card + Next steps */}
      <section className="rounded-2xl border border-neutral-800 bg-gradient-to-br from-neutral-900 to-neutral-950 p-5">
        <div className="text-sm text-neutral-400">Your digital card</div>

        <div className="mt-2 grid gap-4 md:grid-cols-3">
          {/* Card & details */}
          <div className="md:col-span-2">
            <div className="text-2xl font-semibold">TradeCard</div>
            <div className="mt-1 text-sm text-neutral-300">{user?.email ?? "—"}</div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="rounded-lg border border-neutral-800 p-3 text-center">
                <div className="text-xl font-semibold">{TIER_COPY[tier].label}</div>
                <div className="mt-1 text-xs text-neutral-400">Tier</div>
              </div>

              <div className="rounded-lg border border-neutral-800 p-3 text-center">
                <div className="text-xl font-semibold truncate">{maskedId(user?.id)}</div>
                <div className="mt-1 text-xs text-neutral-400">Card ID</div>
              </div>

              <div className="rounded-lg border border-neutral-800 p-3 text-center">
                <button
                  onClick={copyCardId}
                  className="rounded bg-neutral-800 px-3 py-1 text-sm hover:bg-neutral-700 disabled:opacity-50"
                  disabled={!user?.id}
                >
                  {copied ? "Copied ✓" : "Copy ID"}
                </button>
                <div className="mt-1 text-xs text-neutral-400">For support & verification</div>
              </div>
            </div>
          </div>

          {/* Next steps quick links */}
          <aside className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
            <div className="font-medium">What next?</div>
            <p className="mt-1 text-sm text-neutral-300">{TIER_COPY[tier].blurb}</p>

            <div className="mt-3 grid gap-2">
              <Link href="/offers" className="block">
                <PrimaryButton className="w-full">Browse offers</PrimaryButton>
              </Link>

              {tier !== "access" ? (
                <>
                  <Link href="/benefits" className="block">
                    <button className="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-2 font-medium hover:bg-neutral-800">
                      See your benefits
                    </button>
                  </Link>
                  <Link href="/rewards" className="block">
                    <button className="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-2 font-medium hover:bg-neutral-800">
                      Check rewards
                    </button>
                  </Link>
                </>
              ) : (
                <>
                  <PrimaryButton onClick={() => goJoin("member")} className="w-full">
                    {accessCta}
                  </PrimaryButton>
                  <button
                    onClick={() => goJoin("pro")}
                    className="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-2 font-medium hover:bg-neutral-800"
                  >
                    Choose Pro (£7.99/mo)
                  </button>
                </>
              )}
            </div>
          </aside>
        </div>
      </section>

      {/* Onboarding form */}
      <section className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
        <div className="font-medium">Tell us how to reach you</div>
        <p className="mt-1 text-sm text-neutral-300">
          We’ll use this for support and rewards notifications. We never spam.
        </p>

        {error && (
          <div className="mt-3 rounded border border-red-600/40 bg-red-900/10 px-3 py-2 text-red-300 text-sm">
            {error}
          </div>
        )}
        {savedOnce && !error && (
          <div className="mt-3 rounded border border-green-600/40 bg-green-900/10 px-3 py-2 text-green-300 text-sm">
            Saved ✓
          </div>
        )}

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="name" className="block text-xs text-neutral-400 mb-1">
              Your name <span className="text-neutral-500">(optional)</span>
            </label>
            <input
              id="name"
              type="text"
              inputMode="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
              placeholder="e.g. Alex Smith"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-xs text-neutral-400 mb-1">
              Mobile number{" "}
              {tier === "member" || tier === "pro" ? (
                <span className="text-amber-300">(required for paid)</span>
              ) : (
                <span className="text-neutral-500">(optional)</span>
              )}
            </label>
            <input
              id="phone"
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
              placeholder="+44 7700 900123"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <PrimaryButton onClick={saveAndContinue} disabled={saving}>
            {tier === "access" ? "Save & continue to offers" : "Save & go to my account"}
          </PrimaryButton>
          {tier === "access" && (
            <button
              type="button"
              onClick={skipForNow}
              className="rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm font-medium hover:bg-neutral-800"
            >
              Skip for now
            </button>
          )}
        </div>
      </section>
    </Container>
  );
}