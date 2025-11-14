// app/lib/track.ts

export type TrackEvent =
  | "account_manage_billing_click"
  | "activation_finalised"
  | "activation_link_resend"
  | "activation_link_sent"
  | "checkout_fail"
  | "checkout_return_pending"
  | "checkout_start"
  | "join_free_click"
  | "join_member_click"
  | "join_pro_click"
  | "offer_click"
  | "offers_nudge_join_free_click"
  | "offers_nudge_upgrade_click"
  | "success_poll_error"
  | "success_poll_ready"
  | "success_poll_timeout"
  | "welcome_cta_benefits"
  | "welcome_cta_join_member"
  | "welcome_cta_offers"
  | "welcome_cta_rewards"
  | "welcome_profile_saved"
  | "welcome_skip"
  | "welcome_view";

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
