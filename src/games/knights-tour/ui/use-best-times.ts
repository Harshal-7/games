"use client";

import { createStore } from "@/party/ui/store";

import type { Size } from "../logic/board";
import { parseBest, withRun, type Best, type BestTimes } from "../logic/best";

/** Best times live in this browser only. Bump the version if the shape changes. */
const best = createStore<BestTimes, { size: Size; run: Best }>(
  "games:knights-tour:best:v1",
  parseBest,
  (table, { size, run }) => withRun(table, size, run),
  {},
);

export const useBestTimes = best.useStore;

/** Saves the run if it beats the best time for that size. Safe to call twice. */
export function recordBest(size: Size, run: Best): void {
  best.act({ size, run });
}
