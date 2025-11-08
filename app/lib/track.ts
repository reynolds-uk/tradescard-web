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
  | "offer_click"                // <-- added
  | "offer_redeem_click"         // <-- useful: successful redemption click
  | "offers_gate_open"           // <-- useful: opened join modal from offers
  | "join_free"
  | "checkout_start_member"
  | "checkout_start_pro";

export function track(name: TrackEvent, props?: Record<string, unknown>) {
  try {
    // no-op stub; wire to your analytics later
    if (typeof window !== "undefined") {
      // eslint-disable-next-line no-console
      console.debug("[track]", name, props ?? {});
    }
  } catch {
    /* ignore */
  }
}