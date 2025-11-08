import type { Me } from "./useMe";

export const TRIAL_ACTIVE = process.env.NEXT_PUBLIC_TRIAL_ACTIVE === "true";
export const TRIAL_COPY = process.env.NEXT_PUBLIC_TRIAL_COPY || "Try Member for £1 (90 days)";

export function shouldShowTrial(me: Me | null | undefined) {
  if (!TRIAL_ACTIVE) return false;
  if (!me?.ready) return false;
  // Only show to non-paying users
  return me.tier === "access" || me.status === "canceled" || me.status === "free";
}