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

/** Safely join paths (prevents accidental double-slash) */
function joinUrl(base: string, path: string): string {
  return `${base.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

/** Generic JSON fetcher with consistent error surface. */
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

/** POST helper for JSON APIs. */
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

/** Canonical rewards shape used by UI */
export type RewardSummary = {
  points_this_month: number;
  lifetime_points: number;
};

/** Raw shapes the API may return (historic/alt keys supported) */
type RewardSummaryRaw = Partial<{
  user_id: string;
  // lifetime variants
  lifetime_points: number;
  total_points: number;
  points: number;
  // month variants
  points_this_month: number;
  month_points: number;
  points_month: number;
}>;

export type Account = {
  user_id: string;
  email: string;
  full_name?: string | null;
  members: null | {
    status: string; // active | trialing | past_due | canceled | free
    tier: "access" | "member" | "pro" | string;
    current_period_end: string | null;
    stripe_customer_id?: string | null;
    stripe_subscription_id?: string | null;
  };
};

// Composite for the Rewards screen (includes tier + multiplier)
export type RewardsComposite = RewardSummary & {
  tier: "access" | "member" | "pro";
  tier_multiplier: number;          // 1.0, 1.25, 1.5
  entries_this_month: number;       // base points × multiplier (rounded)
};

// ---------- Helpers ----------

export function tierMultiplier(tier: string | null | undefined): number {
  switch ((tier || "access").toLowerCase()) {
    case "pro":
      return 1.5;
    case "member":
      return 1.25;
    default:
      return 1.0;
  }
}

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

/** Normalises any rewards response into { points_this_month, lifetime_points } */
export async function fetchRewardsSummary(user_id: string): Promise<RewardSummary> {
  const raw = await getJSON<RewardSummaryRaw>(
    `/api/rewards/summary?user_id=${encodeURIComponent(user_id)}`,
    undefined,
    true
  );

  const points_this_month =
    Number(
      raw.points_this_month ??
        raw.month_points ??
        raw.points_month ??
        0
    ) || 0;

  const lifetime_points =
    Number(
      raw.lifetime_points ??
        raw.total_points ??
        raw.points ??
        0
    ) || 0;

  return { points_this_month, lifetime_points };
}

/** Account snapshot for current user (no-store). */
export async function fetchAccount(user_id: string): Promise<Account> {
  return getJSON(`/api/account?user_id=${encodeURIComponent(user_id)}`, undefined, true);
}

/**
 * Composite helper for the Rewards page.
 * Fetches rewards + account tier and returns a single object
 * with month/lifetime points, tier, multiplier and entries.
 */
export async function fetchRewardsComposite(user_id: string): Promise<RewardsComposite> {
  const [summary, account] = await Promise.all([
    fetchRewardsSummary(user_id),
    fetchAccount(user_id),
  ]);

  const tier =
    (account.members?.tier as "access" | "member" | "pro") ?? "access";
  const mult = tierMultiplier(tier);
  const entries = Math.round(summary.points_this_month * mult);

  return {
    ...summary,
    tier,
    tier_multiplier: mult,
    entries_this_month: entries,
  };
}

/** Billing portal opener (POST) */
export async function createBillingPortal(user_id: string): Promise<{ url: string }> {
  return postJSON(`/api/stripe/portal`, { user_id });
}

// ---------- Export base ----------
export { API_BASE };