"use client";

import { playedToday } from "@/solo/daily";
import { useToday } from "@/solo/ui/use-today";
import { CheckIcon } from "@/ui/icons";

import { useStats } from "./stores";

/** "✓ 5/5 today" on the games list once today's five are done. */
export function Make24Badge() {
  const stats = useStats();
  const today = useToday();
  const done = today ? playedToday(stats, today) : null;
  if (!done) return null;
  return (
    <span className="game-chip is-daily">
      {done.won && <CheckIcon width={12} height={12} strokeWidth={3.4} />}
      <span className="game-chip-num">{done.score}/5</span> today
    </span>
  );
}
