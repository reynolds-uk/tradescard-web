// app/lib/track.ts

export type TrackEvent =
  | "welcome_view"
  | "welcome_cta_offers"
  | "welcome_cta_benefits"
  | "welcome_cta_rewards"
  | "welcome_cta_join_member"
  | "offers_nudge_upgrade_click"
  | "offer_click"
  | "offers_nudge_join_free_click"
  | "join_member_click"
  | "join_pro_click"
  | "join_free_click"
  | "welcome_profile_saved"
  | "welcome_skip"
  // NEW: checkout + activation + success states
  | "checkout_start"
  | "checkout_fail"
  | "checkout_return_pending"
  | "activation_link_sent"
  | "activation_link_resend"
  | "activation_finalised"
    | /* existing ones */ "welcome_skip"
  | "account_manage_billing_click"
  | "success_poll_ready"
  | "success_poll_timeout"
  | "success_poll_error";

// Keep implementation simple; your analytics layer can hook the CustomEvent.
export function track(
  event: TrackEvent,
  meta: Record<string, string | number | boolean> = {}
) {
  try {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("tc:track", { detail: { event, meta } }));
      // Optional debug:
      // console.debug("[track]", event, meta);
    }
  } catch {}
}