// src/lib/api.ts
/**
 * Central API helper for TradesCard web app.
 * Handles fetches to the public API layer (tradescard-api.vercel.app)
 * and provides typed convenience wrappers.
 */

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://tradescard-api.vercel.app";

/**
 * Safely join paths (prevents accidental double-slash)
 */
function joinUrl(base: string, path: string): string {
  return `${base.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

/**
 * Generic JSON fetcher with consistent error surface.
 * If `noStore` is true, disables caching for dynamic data.
 */
export async function getJSON<T>(
  path: string,
  init?: RequestInit,
  noStore = false
): Promise<T> {
  const url = joinUrl(API_BASE, path);
  const res = await fetch(url, {
    cache: noStore ? "no-store" : "force-cache",
    ...init,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`GET ${path} → ${res.status} ${res.statusText}: ${text}`);
  }
  return (await res.json()) as T;
}

/**
 * POST helper for JSON APIs.
 */
export async function postJSON<T>(
  path: string,
  body: Record<string, unknown>,
  init?: RequestInit
): Promise<T> {
  const url = joinUrl(API_BASE, path);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    body: JSON.stringify(body),
    cache: "no-store",
    ...init,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`POST ${path} → ${res.status}: ${text}`);
  }
  return (await res.json()) as T;
}

// ---------- Types ----------

export type Offer = {
  id: string;
  title: string;
  category: string;
  partner: string | null;
  link: string | null;
  is_active: boolean | null;
  starts_at: string | null;
  ends_at: string | null;
};

export type Benefit = {
  id: string;
  title: string;
  description: string | null;
  tier: "access" | "member" | "pro" | string;
  link: string | null;
  is_active: boolean | null;
  priority: number | null;
};

export type RewardSummary = {
  total_points: number;
  month_points?: number;
};

export type Account = {
  user_id: string;
  email: string;
  full_name?: string | null;
  members: null | {
    status: string;
    tier: "access" | "member" | "pro" | string;
    current_period_end: string | null;
    stripe_customer_id?: string | null;
    stripe_subscription_id?: string | null;
  };
};

// ---------- Public wrappers ----------

export async function fetchOffers(limit = 12): Promise<Offer[]> {
  return getJSON(`/api/offers?limit=${limit}`);
}

export async function fetchBenefits(
  tier?: "access" | "member" | "pro"
): Promise<Benefit[]> {
  const qs = tier ? `?tier=${tier}` : "";
  return getJSON(`/api/benefits${qs}`);
}

export async function fetchRewardsSummary(
  user_id: string
): Promise<RewardSummary> {
  return getJSON(`/api/rewards/summary?user_id=${encodeURIComponent(user_id)}`, undefined, true);
}

/**
 * Account snapshot for current user.
 * (Can be used server-side or client-side)
 */
export async function fetchAccount(user_id: string): Promise<Account> {
  return getJSON(`/api/account?user_id=${encodeURIComponent(user_id)}`, undefined, true);
}

// ---------- Export base ----------
export { API_BASE };