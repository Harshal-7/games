import type { Rng } from "@/party/logic/random";
import { dailyRng } from "@/solo/daily";

import { rate, type Level } from "./solver";

/** The highest number on a card: 9 normally, 13 with the option on. */
export type Top = 9 | 13;

/** The daily five, easy to hard. */
export const DAILY_LEVELS: readonly Level[] = ["easy", "easy", "medium", "hard", "hard"];

/**
 * A hand at a level that can be made: four numbers from 1 to `top`, smallest first.
 * Hands in `avoid` (as "3 3 8 8") are skipped, so a run doesn't repeat itself.
 */
export function dealHand(level: Level, top: Top, rng: Rng, avoid: ReadonlySet<string> = new Set()): number[] {
  let fallback: number[] | null = null;
  for (let tries = 0; tries < 5000; tries++) {
    const hand = Array.from({ length: 4 }, () => 1 + Math.floor(rng() * top)).sort((a, b) => a - b);
    if (avoid.has(hand.join(" "))) continue;
    const r = rate(hand);
    if (!r) continue;
    if (r.level === level) return hand;
    fallback ??= hand;
  }
  // Only reachable with a broken generator; any hand that can be made beats none.
  return fallback ?? [1, 2, 3, 4];
}

/** Today's five hands: the same on every phone. */
export function dailyHands(day: string): number[][] {
  const rng = dailyRng("make-24", day);
  const seen = new Set<string>();
  return DAILY_LEVELS.map((level) => {
    const hand = dealHand(level, 9, rng, seen);
    seen.add(hand.join(" "));
    return hand;
  });
}
