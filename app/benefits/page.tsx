"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

type Benefit = {
  id: string;
  title: string;
  description?: string | null;
  tier?: "member" | "pro" | "access" | string;
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

export default function PublicBenefitsPage() {
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

  useEffect(() => {
    let aborted = false;

    async function run() {
      setLoading(true);
      setErr("");

      try {
        // session + account
        const { data } = await supabase.auth.getSession();
        const user = data?.session?.user ?? null;

        let tier: Me["tier"] = "access";
        let status = "free";
        if (user) {
          const acc = await fetch(
            `${API_BASE}/api/account?user_id=${encodeURIComponent(user.id)}`,
            { cache: "no-store" }
          );
          if (acc.ok) {
            const a = await acc.json();
            tier = (a?.members?.tier as Me["tier"]) ?? "access";
            status = a?.members?.status ?? "free";
            if (!aborted)
              setMe({
                user_id: a?.user_id ?? user.id,
                email: a?.email,
                tier,
                status,
              });
          }
        } else {
          setMe(null);
        }

        // fetch list (API can return all; we filter)
        const res = await fetch(`${API_BASE}/api/benefits`, { cache: "no-store" });
        if (!res.ok) throw new Error(`benefits ${res.status}`);
        const list: Benefit[] = await res.json();

        const isPaidAndActive = tier !== "access" && status === "active";
        const visible = isPaidAndActive
          ? list
          : list.filter((b) => (b.tier ?? "member") === "access"); // if you plan any teaser benefits

        if (!aborted) setBenefits(visible);
      } catch (e: unknown) {
        if (!aborted)
          setErr(e instanceof Error ? e.message : "Something went wrong");
      } finally {
        if (!aborted) setLoading(false);
      }
    }

    run();
    return () => {
      aborted = true;
    };
  }, [supabase]);

  const Gate = () => (
    <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
      <div className="font-medium mb-1">Benefits are for paid members.</div>
      <p className="text-neutral-300">
        Upgrade to <span className="font-medium">Member</span> or{" "}
        <span className="font-medium">Pro</span> to unlock breakdown cover and
        wellbeing support.
      </p>
      <a
        href="/join"
        className="mt-3 inline-block rounded bg-amber-400 text-black font-medium px-4 py-2"
      >
        See membership options
      </a>
    </div>
  );

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <header className="mb-4">
        <h1 className="text-2xl font-semibold">Benefits</h1>
        <p className="text-neutral-400">
          Built-in protection and support. Paid members unlock the full set.
        </p>
      </header>

      {err && (
        <div className="mb-4 rounded border border-red-600/40 bg-red-900/10 p-3 text-red-300">
          {err}
        </div>
      )}

      {loading && (
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 rounded-xl border border-neutral-800 bg-neutral-900 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && !err && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            {benefits.length === 0 && (
              <div className="col-span-full text-neutral-400">
                No benefits to show yet. Check back soon.
              </div>
            )}
            {benefits.map((b) => (
              <a
                key={b.id}
                href={b.link || "#"}
                className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 hover:bg-neutral-800"
                target={b.link?.startsWith("http") ? "_blank" : undefined}
                rel={b.link?.startsWith("http") ? "noopener noreferrer" : undefined}
              >
                <div className="text-sm text-neutral-400">{(b.tier ?? "member").toUpperCase()}</div>
                <div className="font-medium">{b.title}</div>
                {b.description && (
                  <div className="text-sm text-neutral-400 mt-1">{b.description}</div>
                )}
              </a>
            ))}
          </div>

          {(!me || me.tier === "access" || me.status !== "active") && <Gate />}
        </>
      )}
    </main>
  );
}