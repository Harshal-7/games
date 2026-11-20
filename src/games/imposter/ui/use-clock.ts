"use client";

import { useSyncExternalStore } from "react";

/** One shared clock that ticks four times a second while something is listening. */
let now = 0;
let interval: number | undefined;
const listeners = new Set<() => void>();

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  if (listeners.size === 1) {
    now = Date.now();
    interval = window.setInterval(() => {
      now = Date.now();
      for (const listener of listeners) listener();
    }, 250);
  }
  return () => {
    listeners.delete(onChange);
    if (listeners.size === 0) window.clearInterval(interval);
  };
}

/** The current time in ms, refreshed while the component is on screen. */
export function useClock(): number {
  return useSyncExternalStore(subscribe, () => (now ||= Date.now()), () => 0);
}
