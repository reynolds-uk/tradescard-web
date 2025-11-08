// app/lib/track.ts

export type TrackEvent =
  | "welcome_view"
  | "welcome_cta_offers"
  | "welcome_cta_benefits"
  | "welcome_cta_rewards"
  | "welcome_cta_join_member"
  | "offers_nudge_upgrade_click"
  | "offer_click"
  // NEW: join-page specific
  | "join_member_click"
  | "join_pro_click"
  | "join_free_click";
  
// (keep your existing `track()` implementation as-is)
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
  } catch {}
}