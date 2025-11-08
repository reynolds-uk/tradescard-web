// app/lib/track.ts

export type TrackEvent =
  | "welcome_view"
  | "welcome_copy_card"
  | "welcome_cta_offers"
  | "welcome_cta_benefits"
  | "welcome_cta_rewards"
  | "welcome_cta_join_member"
  | "welcome_cta_join_member_banner"
  | "offer_click"
  | "offers_nudge_upgrade_click"
  | "offers_nudge_join_free_click"
  | "join_member_click"
  | "join_pro_click"
  | "join_free_click";

export function track(
  event: TrackEvent,
  meta: Record<string, string | number | boolean> = {}
) {
  try {
    window.fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, meta }),
      keepalive: true,
    });
  } catch (err) {
    console.warn("Track error:", err);
  }
}