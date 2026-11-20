"use client";

import { useEffect, useState } from "react";

import { analyseMoves, knownAnalysis, walkBack } from "../logic/analysis";
import type { BoardId } from "../logic/boards";
import type { Move } from "../logic/game";
import type { Analysis } from "../logic/solver";

/** Steps per slice: a few dozen milliseconds on a phone, so a tap never waits long. */
const SLICE = 12_000;
/** Slices before giving up on a position: then the stuck card stays quiet. */
const ROUNDS = 25;
/** Waits for the marble's hop to finish before searching. */
const SETTLE_MS = 320;

export type PositionInfo = {
  analysis: Analysis;
  /** When one marble is out of reach: the jumps to keep to get back to where it isn't. */
  back: number | null;
};

/**
 * What the solver knows about the board on screen, worked out in short slices after
 * each jump so the page never freezes: known answers at once (the book line, or the
 * jump that followed an answer), a search otherwise, and when one marble is out of
 * reach, the last good move.
 */
export function useAnalysis(board: BoardId, moves: readonly Move[], enabled: boolean): PositionInfo {
  const [found, setFound] = useState<{ moves: readonly Move[]; info: PositionInfo } | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const job = work(board, moves);
    let timer = 0;
    const run = () => {
      const step = job.next();
      if (step.done) setFound({ moves, info: step.value });
      else timer = window.setTimeout(run, 0);
    };
    timer = window.setTimeout(run, SETTLE_MS);
    return () => window.clearTimeout(timer);
  }, [board, moves, enabled]);

  if (found && found.moves === moves) return found.info;
  return { analysis: knownAnalysis(board, moves), back: null };
}

function* work(board: BoardId, moves: readonly Move[]): Generator<void, PositionInfo> {
  let analysis = knownAnalysis(board, moves);
  for (let round = 0; analysis.status === "unknown" && round < ROUNDS; round++) {
    analysis = analyseMoves(board, moves, SLICE, round);
    yield;
  }
  const back = analysis.status === "impossible" ? yield* walkBack(board, moves, 12, SLICE) : null;
  return { analysis, back };
}
