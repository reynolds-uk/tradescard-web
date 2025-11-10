// app/lib/subscription.ts
export type Tier = "access" | "member" | "pro";
export type AppStatus = "free" | "trial" | "paid" | "inactive";

export const isPaidTier = (tier?: Tier) => tier === "member" || tier === "pro";
export const isActiveStatus = (s?: AppStatus) => s === "paid" || s === "trial";

/** Gate helper used by TierGate (and anywhere else) */
export function hasAccess(
  gate: "any" | "paid" | "pro",
  tier?: Tier,
  status?: AppStatus
) {
  if (gate === "any") return true;
  if (gate === "pro") return tier === "pro" && isActiveStatus(status);
  // gate === "paid"
  return isPaidTier(tier) && isActiveStatus(status);
}