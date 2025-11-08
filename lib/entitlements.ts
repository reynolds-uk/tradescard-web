export type Tier = "access" | "member" | "pro";

export function isPaidTier(tier?: string | null) {
  return tier === "member" || tier === "pro";
}

export function isActive(status?: string | null) {
  return status === "active" || status === "trialing";
}

export function isActivePaid(tier?: string | null, status?: string | null) {
  return isPaidTier(tier) && isActive(status);
}
