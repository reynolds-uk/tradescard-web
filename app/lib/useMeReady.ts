// app/lib/useMeReady.ts
"use client";

import { useEffect, useRef, useState } from "react";
import { useMe } from "./useMe";

/**
 * Returns true once auth has resolved (and a short frame has passed)
 * so pages don't render "logged-out" before flipping to "in".
 */
export function useMeReady(): boolean {
  const me = useMe(); // { user?, tier?, status? } – your existing hook
  const [ready, setReady] = useState(false);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (!me) return; // defensive
    // When user/tier/status are known (even if logged out), mark ready on next frame
    const known = typeof me.user !== "undefined" && typeof me.tier !== "undefined";
    if (known && !ready) {
      raf.current = requestAnimationFrame(() => setReady(true));
    }
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me?.user, me?.tier, me?.status]);

  return ready;
}