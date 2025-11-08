// app/lib/useMeReady.ts
import { useMe } from "./useMe";
export function useMeReady() {
  const me = useMe();
  // treat "we’ve checked once" as ready; fall back to “user !== undefined” if your hook exposes it
  const ready = typeof me?.tier !== "undefined" || typeof me?.status !== "undefined" || !!me?.user || me === null;
  return { me, ready };
}