"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const POLL_MS = 1500;
const MAX_POLLS = 10;

export default function CheckoutSuccess() {
  const router = useRouter();
  const params = useSearchParams();
  const plan = params.get("plan") ?? undefined;

  const supabase = useMemo(
    () => createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ),
    []
  );

  const [status, setStatus] = useState<"waiting"|"ready"|"timeout"|"error">("waiting");

  useEffect(() => {
    let cancelled = false;
    let tries = 0;

    (async function poll() {
      try {
        // 1) who am I?
        const { data: s } = await supabase.auth.getSession();
        const uid = s?.session?.user?.id;
        if (!uid) { setStatus("error"); return; }

        // 2) read tier + member status
        const { data: prof, error: pErr } = await supabase
          .from("profiles").select("tier").eq("user_id", uid).maybeSingle();
        if (pErr) throw pErr;

        const { data: mem, error: mErr } = await supabase
          .from("members").select("status").eq("user_id", uid).maybeSingle();
        if (mErr) throw mErr;

        const tierOk = prof?.tier === "member" || prof?.tier === "pro";
        const subOk = mem?.status === "active" || mem?.status === "trialing";

        if (tierOk && subOk) {
          setStatus("ready");
          if (!cancelled) router.replace(`/account${plan ? `?joined=${plan}` : ""}`);
          return;
        }

        if (++tries >= MAX_POLLS) {
          setStatus("timeout");
          return;
        }
        setTimeout(poll, POLL_MS);
      } catch {
        setStatus("error");
      }
    })();

    return () => { cancelled = true; };
  }, [router, supabase, plan]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-xl font-semibold">Thanks — processing your membership</h1>
      <p className="mt-2 text-sm text-neutral-400">
        We’re just confirming your subscription. This usually takes a moment.
      </p>

      {status === "timeout" && (
        <div className="mt-4 rounded border border-yellow-600/40 bg-yellow-900/10 p-3 text-yellow-200 text-sm">
          Taking longer than expected. You can refresh this page, or head to{" "}
          <a className="underline" href="/account">your account</a>.
        </div>
      )}
      {status === "error" && (
        <div className="mt-4 rounded border border-red-600/40 bg-red-900/10 p-3 text-red-300 text-sm">
          We couldn’t confirm your subscription just now. Please open{" "}
          <a className="underline" href="/account">your account</a>.
        </div>
      )}
    </div>
  );
}