import { describe, expect, it } from "vitest";

import { isClosedTour, isKnightMove, legalMoves } from "./board";
import { analyse, analyseCached, lastFinishable } from "./solver";

function expectFullTour(path: readonly number[], size: number) {
  expect(path).toHaveLength(size * size);
  expect(new Set(path).size).toBe(size * size);
  for (let i = 1; i < path.length; i++) expect(isKnightMove(path[i - 1], path[i], size)).toBe(true);
}

const colour = (sq: number, size: number) => (Math.floor(sq / size) + (sq % size)) % 2;

describe("solver", () => {
  it.each([5, 6, 7, 8])("finishes a real tour from a corner on %i×%i", (size) => {
    const result = analyse([0], size);
    expect(result.status).toBe("solvable");
    if (result.status === "solvable") expectFullTour([0, ...result.completion], size);
  });

  it("settles every 5×5 start, and odd-coloured starts are hopeless", () => {
    for (let sq = 0; sq < 25; sq++) {
      const result = analyse([sq], 5);
      expect(result.status).not.toBe("unknown");
      if (colour(sq, 5) === 1) expect(result.status).toBe("impossible");
      if (result.status === "solvable") expectFullTour([sq, ...result.completion], 5);
    }
  });

  it("finishes from every start on 6×6 and 8×8", () => {
    for (const size of [6, 8]) {
      for (let sq = 0; sq < size * size; sq++) {
        const result = analyse([sq], size);
        expect(result.status).toBe("solvable");
        if (result.status === "solvable") expectFullTour([sq, ...result.completion], size);
      }
    }
  });

  it("spots a dead end while moves are still left", () => {
    // On 6×6 the top-left corner is reached only from squares 8 and 13; both are used
    // and the knight has walked away, so the corner can never be visited.
    const path = [8, 21, 13, 24];
    expect(legalMoves(path, 6).length).toBeGreaterThan(0);
    expect(analyse(path, 6).status).toBe("impossible");
  });

  it("spots a corner that would have to be the last square but has the wrong colour", () => {
    // Found in random play: plenty of moves left, the corner is forced to be last,
    // but the knight can only finish on the other colour.
    expect(analyse([31, 46, 36], 8).status).toBe("impossible");
    expect(analyse([27, 42, 32, 17, 2], 8).status).toBe("impossible");
  });

  it("finds the last position that can still be finished", () => {
    const path = [8, 21, 13, 24];
    const back = lastFinishable(path, 6);
    expect(back).toBeGreaterThan(0);
    expect(analyse(path.slice(0, back), 6).status).toBe("solvable");
    expect(analyse(path.slice(0, back + 1), 6).status).not.toBe("solvable");
  });

  it("goes back to no knight at all when the start itself is hopeless", () => {
    expect(lastFinishable([1, 12], 5)).toBe(0);
  });

  it("answers the next position from the cached route", () => {
    const first = analyseCached([0], 7);
    expect(first.status).toBe("solvable");
    if (first.status !== "solvable") return;
    const next = analyseCached([0, first.completion[0]], 7);
    expect(next).toEqual({ status: "solvable", completion: first.completion.slice(1) });
  });

  it("knows a complete tour is closed when the last square is a jump from the first", () => {
    const result = analyse([0], 6);
    if (result.status !== "solvable") throw new Error("expected a tour");
    const tour = [0, ...result.completion];
    expect(isClosedTour(tour, 6)).toBe(isKnightMove(tour[tour.length - 1], tour[0], 6));
  });
});
