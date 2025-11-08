// app/lib/track.ts
export type TrackEvent =
  | "welcome_view"
  | "welcome_copy_card"
  | "welcome_cta_offers"
  | "welcome_cta_benefits"
  | "welcome_cta_rewards"
  | "welcome_cta_join_member"
  | "welcome_cta_join_member_banner"
  | "nav_upgrade_click"
  | "offers_list_loaded"
  | "offers_gate_open"
  | "offer_click"
  | "offer_redeem_click"
  | "offers_nudge_upgrade_click"   // <-- add this
  | "offers_nudge_join_free_click" // <-- add if you track the second button
  | "join_free"
  | "checkout_start_member"
  | "checkout_start_pro";

export function track(name: TrackEvent, props?: Record<string, unknown>) {
  try {
    if (typeof window !== "undefined") {
      // eslint-disable-next-line no-console
      console.debug("[track]", name, props ?? {});
    }
  } catch {/* no-op */}
}