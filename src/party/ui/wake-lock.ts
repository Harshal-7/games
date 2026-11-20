"use client";

import { useEffect } from "react";

/**
 * Keeps the screen on while `on` (a round of a party game, a night of Mafia). Phones drop
 * the lock whenever the page is hidden, so it asks again when the page comes back, and on
 * any tap in case the phone only allows it after one. Needs https (a phone on the
 * laptop's network address can't use it) and does nothing where the browser can't.
 */
export function useWakeLock(on: boolean): void {
  useEffect(() => {
    if (!on || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let asking = false;
    let stopped = false;

    const ask = async () => {
      if (asking || stopped || document.visibilityState !== "visible" || (lock && !lock.released)) return;
      asking = true;
      try {
        const next = await navigator.wakeLock.request("screen");
        if (stopped) void next.release();
        else lock = next;
      } catch {
        // Not allowed right now (battery saver, page in the background): the next tap or visit back asks again.
      } finally {
        asking = false;
      }
    };

    void ask();
    document.addEventListener("visibilitychange", ask);
    document.addEventListener("pointerdown", ask, { passive: true });
    return () => {
      stopped = true;
      document.removeEventListener("visibilitychange", ask);
      document.removeEventListener("pointerdown", ask);
      void lock?.release();
    };
  }, [on]);
}
