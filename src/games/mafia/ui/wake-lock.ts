"use client";

import { useEffect } from "react";

/**
 * Keeps the screen on while `on` (Screen Wake Lock, https only). The phone drops the lock
 * whenever the page is hidden, so it's asked for again each time the page comes back.
 * Phones without it just dim as usual.
 */
export function useWakeLock(on: boolean): void {
  useEffect(() => {
    if (!on || typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let done = false;
    const ask = async () => {
      if (document.visibilityState !== "visible" || (lock && !lock.released)) return;
      try {
        const got = await navigator.wakeLock.request("screen");
        if (done) void got.release();
        else lock = got;
      } catch {
        // Low battery, or the browser said no: the screen dims as usual.
      }
    };
    void ask();
    document.addEventListener("visibilitychange", ask);
    return () => {
      done = true;
      document.removeEventListener("visibilitychange", ask);
      void lock?.release();
    };
  }, [on]);
}
