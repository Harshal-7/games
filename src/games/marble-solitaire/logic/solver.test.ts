import { describe, expect, it } from "vitest";

import { BOARD_IDS, BOARDS, type Board, type Jump } from "./boards";
import { settle } from "./analysis";
import { legalJumps, marbleCount, startMarbles } from "./game";
import { PAGODAS } from "./pagodas";
import { analyse, classOf, DEFAULT_BUDGET, forgetDeadPositions, pagodaWeights, possibleLastHoles } from "./solver";

/** A small seeded random number source, so failures repeat. */
function random(seed: number) {
  return () => ((seed = (Math.imul(seed, 1103515245) + 12345) >>> 0) / 4294967296);
}

function play(marbles: boolean[], { from, over, to }: Jump) {
  marbles[from] = false;
  marbles[over] = false;
  marbles[to] = true;
}

/** Plays the completion and checks every jump is legal and one marble is left. */
function expectFinish(board: Board, marbles: readonly boolean[], completion: readonly Jump[], goal: boolean) {
  const m = marbles.slice();
  for (const jump of completion) {
    expect(legalJumps(board, m)).toContainEqual(jump);
    play(m, jump);
  }
  expect(marbleCount(m)).toBe(1);
  if (goal) expect(m[board.goal]).toBe(true);
}

describe("pagoda functions", () => {
  it("never let a jump raise the total, mirror images included", () => {
    for (const [key, functions] of Object.entries(PAGODAS)) {
      const board = BOARDS[key.split(":")[0] as keyof typeof BOARDS];
      for (const rows of functions) {
        const weights = pagodaWeights(board, rows);
        expect(weights.every(Number.isFinite)).toBe(true);
        for (const map of board.symmetries) {
          const image: number[] = [];
          weights.forEach((w, h) => (image[map[h]] = w));
          for (const { from, over, to } of board.jumps) expect(image[from] + image[over]).toBeGreaterThanOrEqual(image[to]);
        }
      }
    }
  });
});

describe("position class", () => {
  it.each(BOARD_IDS)("%s: never changes as the game goes on", (id) => {
    const board = BOARDS[id];
    const rand = random(7);
    for (let game = 0; game < 30; game++) {
      const marbles = startMarbles(board);
      const cls = classOf(board, (h) => marbles[h]);
      for (;;) {
        const legal = legalJumps(board, marbles);
        if (legal.length === 0) break;
        play(marbles, legal[Math.floor(rand() * legal.length)]);
        expect(classOf(board, (h) => marbles[h])).toBe(cls);
      }
    }
  });

  it("knows where the last marble can end", () => {
    const names = (board: Board) =>
      possibleLastHoles(board, startMarbles(board)).map((h) => `${board.holes[h].row},${board.holes[h].col}`);
    expect(names(BOARDS.english)).toEqual(["0,3", "3,0", "3,3", "3,6", "6,3"]);
    expect(names(BOARDS.european)).toContain("5,3");
    expect(names(BOARDS.european)).not.toContain("3,3");
    expect(names(BOARDS.triangle)).toContain("0,0");
  });

  it("proves the European board can't be solved from the centre", () => {
    const board = BOARDS.european;
    const marbles = board.holes.map((h) => !(h.row === 3 && h.col === 3));
    expect(analyse(board, marbles, "any", 10).status).toBe("impossible");
  });
});

describe("solver", () => {
  it.each(BOARD_IDS)("finishes %s from the start in the goal hole", (id) => {
    forgetDeadPositions();
    const board = BOARDS[id];
    const result = settle(board, startMarbles(board), "goal", 400_000);
    expect(result.status).toBe("solvable");
    if (result.status === "solvable") expectFinish(board, startMarbles(board), result.completion, true);
  }, 30_000);

  it("settles the triangle from every start", () => {
    const board = BOARDS.triangle;
    for (let empty = 0; empty < 15; empty++) {
      const marbles = board.holes.map((_, h) => h !== empty);
      const result = analyse(board, marbles, "any", 50_000);
      // Only starts in the triangle's own class come from its game; the rest are hopeless.
      expect(result.status).not.toBe("unknown");
    }
  });

  it("spots marbles stranded far apart", () => {
    const board = BOARDS.english;
    const at = (r: number, c: number) => board.holes.findIndex((h) => h.row === r && h.col === c);
    const marbles = board.holes.map((_, h) => h === at(0, 2) || h === at(0, 3) || h === at(6, 3));
    expect(legalJumps(board, marbles).length).toBeGreaterThan(0);
    expect(analyse(board, marbles, "any", 10).status).toBe("impossible");
  });

  // Like Knight's Tour's: random games on every board, every position checked on the
  // normal budget. Late positions always settle, any answer is right, and none takes long.
  it.each(BOARD_IDS)("stays fast on random %s positions", (id) => {
    const board = BOARDS[id];
    const rand = random(id.length * 101);
    let slowest = 0;
    for (let game = 0; game < 6; game++) {
      forgetDeadPositions();
      const marbles = startMarbles(board);
      for (;;) {
        const legal = legalJumps(board, marbles);
        if (legal.length === 0) break;
        play(marbles, legal[Math.floor(rand() * legal.length)]);
        const t0 = performance.now();
        const result = analyse(board, marbles, "any", DEFAULT_BUDGET);
        slowest = Math.max(slowest, performance.now() - t0);
        if (marbleCount(marbles) <= 12) expect(result.status).not.toBe("unknown");
        if (result.status === "solvable") expectFinish(board, marbles, result.completion, false);
      }
      // Wherever the game stopped, the solver agrees one marble is out of reach (or left).
      if (marbleCount(marbles) > 1) expect(analyse(board, marbles, "any").status).toBe("impossible");
    }
    expect(slowest).toBeLessThan(1500);
  }, 30_000);
});
