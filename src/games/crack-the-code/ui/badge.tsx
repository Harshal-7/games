"use client";

import { playedToday, puzzleNumber } from "@/solo/daily";
import { useToday } from "@/solo/ui/use-today";
import { CheckIcon } from "@/ui/icons";

import { useStats } from "./stores";

/** "✓ #14 cracked" on the games list once today's code is done. */
export function CrackTheCodeBadge() {
  const stats = useStats();
  const today = useToday();
  const done = today ? playedToday(stats, today) : null;
  if (!today || !done) return null;
  return (
    <span className="game-chip is-daily">
      {done.won && <CheckIcon width={12} height={12} strokeWidth={3.4} />}
      <span className="game-chip-num">#{puzzleNumber(today)}</span> {done.won ? "cracked" : "not cracked"}
    </span>
  );
}
