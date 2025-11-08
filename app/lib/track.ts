// app/lib/track.ts
export type TrackEvent =
  | "welcome_view"
  | "welcome_cta_offers"
  | "welcome_cta_benefits"
  | "welcome_cta_rewards"
  | "welcome_copy_card";

/**
 * Stub analytics tracker. Wire this to PostHog/GA later.
 */
export function track(event: TrackEvent, meta?: Record<string, string | number>) {
  // mark params as intentionally used to satisfy no-unused-vars
  void event;
  void meta;
}