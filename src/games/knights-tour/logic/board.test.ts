import { describe, expect, it } from "vitest";

import { isClosedTour, isKnightMove, knightMoves, legalMoves, squareName } from "./board";

describe("knight moves", () => {
  it("has 2 moves from a corner, 8 from the middle of a big board", () => {
    expect([...knightMoves(5)[0]].sort((a, b) => a - b)).toEqual([7, 11]);
    expect(knightMoves(8)[27]).toHaveLength(8);
  });

  it("never jumps off the board or wraps round an edge", () => {
    for (const size of [5, 6, 7, 8]) {
      knightMoves(size).forEach((targets, from) => {
        for (const to of targets) {
          const dr = Math.abs(Math.floor(from / size) - Math.floor(to / size));
          const dc = Math.abs((from % size) - (to % size));
          expect(to).toBeGreaterThanOrEqual(0);
          expect(to).toBeLessThan(size * size);
          expect([dr, dc].sort()).toEqual([1, 2]);
          expect(isKnightMove(to, from, size)).toBe(true);
        }
      });
    }
  });

  it("only offers squares not visited yet", () => {
    expect(legalMoves([], 5)).toEqual([]);
    expect(legalMoves([7, 0], 5)).toEqual([11]);
  });

  it("names squares like a chess board", () => {
    expect(squareName(0, 8)).toBe("a8");
    expect(squareName(63, 8)).toBe("h1");
    expect(squareName(12, 5)).toBe("c3");
  });

  it("calls a tour closed only when it is complete and loops back", () => {
    expect(isClosedTour([0, 7], 5)).toBe(false);
  });
});
