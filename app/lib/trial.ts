// app/lib/trial.ts

type Tier = "access" | "member" | "pro";
type AppStatus = "free" | "trial" | "paid" | "inactive";

export const TRIAL_COPY = "Try Member for £1";

/** Paid & usable right now (includes trial). */
export const isActivePaid = (tier?: Tier, status?: AppStatus) =>
  (tier === "member" || tier === "pro") && (status === "paid" || status === "trial");

/**
 * Show £1 trial only to non-paying users:
 * - Logged out → true
 * - Access tier → true
 * - Member/Pro but not active (e.g. inactive) → true
 * - Active paid (paid or trial) → false
 * - While auth is resolving → false (avoid flicker)
 */
export function shouldShowTrial(me?: {
  ready?: boolean;
  user?: unknown;
  tier?: Tier;
  status?: AppStatus;
}): boolean {
  if (!me?.ready) return false;

  // Logged out → promote trial
  if (!me.user) return true;

  const tier = (me.tier as Tier) ?? "access";
  const status = me.status as AppStatus | undefined;

  if (tier === "access") return true;          // free tier
  if (isActivePaid(tier, status)) return false; // already paying (or on trial)

  // e.g. lapsed/inactive paid plan
  return true;
}