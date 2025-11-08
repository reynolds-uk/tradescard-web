// app/lib/useMeReady.ts
"use client";

import { useEffect, useState } from "react";
import { useMe } from "./useMe";

/** Returns true once we've had a first pass at me(), so pages can avoid flicker. */
export function useMeReady() {
  const me = useMe();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Mark ready after the first derived state; you can tighten this if you add a loading flag to useMe
    setReady(true);
  }, [me?.user, me?.tier, me?.status]);

  return ready;
}