// lib/track.ts
export type TrackEvent =
  | "welcome_view"
  | "welcome_cta_offers"
  | "welcome_cta_benefits"
  | "welcome_cta_rewards"
  | "welcome_copy_card";

export function track(_event: TrackEvent, _meta?: Record<string, string | number>) {
  // no-op for now; swap for PostHog/GA later
}
