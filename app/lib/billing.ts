// tradescard-web/app/lib/billing.ts
import { API_BASE } from "./apiBase";
import { getSupabaseBrowserClient } from "./supabaseBrowserClient";

export async function openBillingPortal(returnUrl = "/account") {
  const supabase = getSupabaseBrowserClient();

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
