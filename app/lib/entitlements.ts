export type Tier = "access" | "member" | "pro";

export const BOOST: Record<Tier, number> = {
  access: 1.0,
  member: 1.25,
  pro: 1.5,
};

export function getBoostForTier(tier: Tier): number {
  return BOOST[tier] ?? 1.0;
}