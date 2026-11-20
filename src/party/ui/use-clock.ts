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

const stopped = () => () => {};

/**
 * The current time in ms, refreshed while the component is on screen and `running`.
 * A stopped clock redraws nothing, so read times that matter (a finish) from the game.
 */
export function useClock(running = true): number {
  return useSyncExternalStore(running ? subscribe : stopped, () => (now ||= Date.now()), () => 0);
}
