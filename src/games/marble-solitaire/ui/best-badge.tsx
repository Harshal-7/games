"use client";

import { formatDuration } from "@/ui/format";

import { BOARD_IDS, DEFAULT_BOARD, type BoardId } from "../logic/boards";
import { useBest, useGame } from "./stores";

const SHORT: Record<BoardId, string> = { triangle: "Triangle", english: "English", european: "European" };

/** "English · Perfect 6:12" on the games list: the board played last, else any with a best. */
export function MarbleSolitaireBestBadge() {
  const best = useBest();
  const last = useGame().board ?? DEFAULT_BOARD;
  const board = best[last] ? last : BOARD_IDS.find((id) => best[id]);
  const record = board ? best[board] : undefined;
  if (!board || !record) return null;
  const what = record.left > 1 ? `${record.left} left` : record.perfect ? "Perfect" : "Solved";
  return (
    <span className="game-chip is-best">
      <span className="game-chip-medal" aria-hidden="true" />
      {SHORT[board]} · {what} <span className="game-chip-num">{formatDuration(record.ms)}</span>
    </span>
  );
}
