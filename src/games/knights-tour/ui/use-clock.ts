"use client";

import { useEffect, useState } from "react";

/** The current time, refreshed a few times a second while `running` is true. */
export function useNow(running: boolean, every = 250): number {
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setNow(Date.now()), every);
    return () => window.clearInterval(id);
  }, [running, every]);
  return now;
}
