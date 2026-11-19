"use client";

import { useSyncExternalStore } from "react";

import type { Size } from "../logic/board";
import { parseBest, withRun, type Best, type BestTimes } from "../logic/best";

/** Best times live in this browser only. Bump the version if the shape changes. */
const KEY = "games:knights-tour:best:v1";
const EMPTY: BestTimes = {};

let table: BestTimes | undefined;
const listeners = new Set<() => void>();

function read(): BestTimes {
  if (table === undefined) {
    try {
      table = parseBest(localStorage.getItem(KEY));
    } catch {
      table = EMPTY;
    }
  }
  return table;
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  // Another tab finished a tour: read the table again.
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    table = undefined;
    onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function useBestTimes(): BestTimes {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

/** Saves the run if it beats the best time for that size. Safe to call twice. */
export function recordBest(size: Size, run: Best): void {
  const before = read();
  const after = withRun(before, size, run);
  if (after === before) return;
  table = after;
  try {
    localStorage.setItem(KEY, JSON.stringify(after));
  } catch {
    // Private mode or full storage: the record still shows for this visit.
  }
  for (const listener of listeners) listener();
}
