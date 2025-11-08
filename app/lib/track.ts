// app/lib/track.ts

export type TrackEvent =
  | "welcome_view"
  | "welcome_copy_card"
  | "welcome_cta_offers"
  | "welcome_cta_benefits"
  | "welcome_cta_rewards"
  | "welcome_cta_join_member"
  | "welcome_cta_join_member_banner";

export function track(
  event: TrackEvent,
  meta?: Record<string, string | number | boolean | null>
) {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent("tc:track", { detail: { event, meta } }));
  } catch {
    /* no-op */
  }
}