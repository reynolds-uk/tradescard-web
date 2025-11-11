// tradescard-web/app/lib/billing.ts
import { createClient } from "@supabase/supabase-js";
import { API_BASE } from "./apiBase";

export async function openBillingPortal(returnUrl = "/account") {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data } = await supabase.auth.getSession();
  const accessToken = data?.session?.access_token;
  if (!accessToken) throw new Error("not_signed_in");

  const res = await fetch(`${API_BASE}/api/stripe/portal`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ returnUrl }),
  });

  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.error || "portal_failed");
  }

  const { url } = (await res.json()) as { url?: string };
  if (!url) throw new Error("no_url");
  window.location.href = url;
}