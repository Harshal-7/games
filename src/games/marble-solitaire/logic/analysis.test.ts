import { describe, expect, it } from "vitest";

import { analyseMoves, bookLine, hintFor, lastGood, nextSolveStep, settle } from "./analysis";
import { BOARD_IDS, BOARDS, type BoardId } from "./boards";
import { legalJumps, marbleCount, marblesAfter, type Move } from "./game";

function random(seed: number) {
  return () => ((seed = (Math.imul(seed, 1103515245) + 12345) >>> 0) / 4294967296);
}

/** Runs Watch it solve to the end; returns the jumps it leaves on the board. */
function watch(id: BoardId, start: readonly Move[]): Move[] {
  const moves = start.slice();
  for (let step = 0; step < 2000; step++) {
    const next = nextSolveStep(id, moves, step);
    if (!next) return moves;
    if (next.type === "undo") moves.pop();
    else moves.push(next.move);
  }
  throw new Error("Watch it solve didn't finish");
}

/** A few random jumps from the start. */
function randomMoves(id: BoardId, count: number, seed: number): Move[] {
  const board = BOARDS[id];
  const rand = random(seed);
  const moves: Move[] = [];
  for (let i = 0; i < count; i++) {
    const legal = legalJumps(board, marblesAfter(board, moves)!);
    if (legal.length === 0) break;
    const { from, to } = legal[Math.floor(rand() * legal.length)];
    moves.push({ from, to });
  }
  return moves;
}

describe("the book", () => {
  it.each(BOARD_IDS)("%s: every jump is legal and the last marble ends in the goal hole", (id) => {
    const board = BOARDS[id];
    const marbles = marblesAfter(board, bookLine(board))!;
    expect(marbleCount(marbles)).toBe(1);
    expect(marbles[board.goal]).toBe(true);
  });
});

describe("Watch it solve", () => {
  it.each(BOARD_IDS)("finishes %s from the start with a Perfect", (id) => {
    const board = BOARDS[id];
    const marbles = marblesAfter(board, watch(id, []))!;
    expect(marbleCount(marbles)).toBe(1);
    expect(marbles[board.goal]).toBe(true);
  });

  it.each(BOARD_IDS)("finishes %s from the middle of a game, stepping back if it must", (id) => {
    for (const seed of [1, 2, 3]) {
      const board = BOARDS[id];
      const moves = watch(id, randomMoves(id, Math.floor(board.holes.length / 3), seed));
      expect(marbleCount(marblesAfter(board, moves)!)).toBe(1);
    }
  });
});

describe("Hint", () => {
  it.each(BOARD_IDS)("%s: never leads into a dead end when the solver knows the answer", (id) => {
    const board = BOARDS[id];
    for (const seed of [11, 12, 13, 14]) {
      const moves = randomMoves(id, Math.floor(board.holes.length / 4), seed);
      if (analyseMoves(id, moves).status !== "solvable") continue;
      // Follow hints to the end: every one keeps one marble in reach.
      for (;;) {
        const hint = hintFor(id, moves);
        if (!hint) break;
        expect(hint).not.toBe("back");
        if (hint === "back") break;
        moves.push(hint);
        expect(settle(board, marblesAfter(board, moves)!, "any", 200_000).status).not.toBe("impossible");
      }
      expect(marbleCount(marblesAfter(board, moves)!)).toBe(1);
    }
  });

  it.each(BOARD_IDS)("%s: says step back in a dead end, and finds the last good move", (id) => {
    const board = BOARDS[id];
    // Random jumps until one marble is out of reach while jumps are still left.
    let found = 0;
    for (let seed = 1; seed < 40 && found < 3; seed++) {
      const moves = randomMoves(id, board.holes.length, seed);
      for (let k = 1; k <= moves.length; k++) {
        const here = moves.slice(0, k);
        if (legalJumps(board, marblesAfter(board, here)!).length === 0) break;
        if (analyseMoves(id, here).status !== "impossible") continue;
        found++;
        expect(hintFor(id, here)).toBe("back");
        const back = lastGood(id, here);
        if (back !== null) {
          expect(back).toBeLessThan(k);
          expect(analyseMoves(id, here.slice(0, back)).status).toBe("solvable");
        }
        break;
      }
    }
    expect(found).toBeGreaterThan(0);
  });

  it("follows the book from the start", () => {
    for (const id of BOARD_IDS) {
      const first = bookLine(BOARDS[id])[0];
      expect(hintFor(id, [])).toEqual({ from: first.from, to: first.to });
    }
  });
});
