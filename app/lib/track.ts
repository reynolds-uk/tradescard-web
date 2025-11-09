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
  | "welcome_skip";

// keep your existing `track()` implementation as-is
export function track(
  event: TrackEvent,
  meta: Record<string, string | number | boolean> = {}
) {
  try {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("tc:track", { detail: { event, meta } }));
    }
    // no-op/log to console or your real analytics here
  } catch {}
}