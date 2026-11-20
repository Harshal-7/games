import { describe, expect, it } from "vitest";

import { BOARD_IDS, BOARDS, type Board } from "./boards";

const at = (board: Board, row: number, col: number) => board.holes.findIndex((h) => h.row === row && h.col === col);
const landings = (board: Board, row: number, col: number) =>
  board.jumps
    .filter((j) => j.from === at(board, row, col))
    .map((j) => [board.holes[j.to].row, board.holes[j.to].col])
    .sort();

describe("boards", () => {
  it("has the right number of holes and jumps", () => {
    expect(BOARDS.triangle.holes).toHaveLength(15);
    expect(BOARDS.english.holes).toHaveLength(33);
    expect(BOARDS.european.holes).toHaveLength(37);
    expect(BOARDS.triangle.jumps).toHaveLength(36);
    expect(BOARDS.english.jumps).toHaveLength(76);
    expect(BOARDS.european.jumps).toHaveLength(92);
  });

  it("jumps in straight lines over one neighbour on the square boards", () => {
    for (const id of ["english", "european"] as const) {
      const board = BOARDS[id];
      for (const { from, over, to } of board.jumps) {
        const [a, b, c] = [from, over, to].map((h) => board.holes[h]);
        const dr = b.row - a.row;
        const dc = b.col - a.col;
        expect(Math.abs(dr) + Math.abs(dc)).toBe(1);
        expect([c.row - b.row, c.col - b.col]).toEqual([dr, dc]);
      }
    }
  });

  it("jumps along the triangle's three directions", () => {
    const board = BOARDS.triangle;
    const directions = new Set<string>();
    for (const { from, over, to } of board.jumps) {
      const [a, b, c] = [from, over, to].map((h) => board.holes[h]);
      const step = [b.row - a.row, b.col - a.col];
      expect([c.row - b.row, c.col - b.col]).toEqual(step);
      directions.add(step.join(","));
    }
    expect([...directions].sort()).toEqual(["-1,-1", "-1,0", "0,-1", "0,1", "1,0", "1,1"]);
    // From the left end of the middle row: up to the top, along the row, and down both ways.
    expect(landings(board, 2, 0)).toEqual([[0, 0], [2, 2], [4, 0], [4, 2]]);
    // The top only jumps down its two sides.
    expect(landings(board, 0, 0)).toEqual([[2, 0], [2, 2]]);
    // No jump across the triangle's missing direction (down and to the left).
    expect(landings(board, 2, 2)).toEqual([[0, 0], [2, 0], [4, 2], [4, 4]]);
  });

  it("has no diagonal jumps on the crosses, and corners jump two ways", () => {
    expect(landings(BOARDS.english, 0, 2)).toEqual([[0, 4], [2, 2]]);
    expect(landings(BOARDS.english, 3, 3)).toEqual([[1, 3], [3, 1], [3, 5], [5, 3]]);
    expect(landings(BOARDS.european, 1, 1)).toEqual([[1, 3], [3, 1]]);
    expect(at(BOARDS.english, 1, 1)).toBe(-1);
  });

  it("starts and ends where the brief says", () => {
    const where = (board: Board, h: number) => [board.holes[h].row, board.holes[h].col];
    expect(where(BOARDS.english, BOARDS.english.start)).toEqual([3, 3]);
    expect(where(BOARDS.english, BOARDS.english.goal)).toEqual([3, 3]);
    expect(where(BOARDS.triangle, BOARDS.triangle.start)).toEqual([0, 0]);
    expect(where(BOARDS.triangle, BOARDS.triangle.goal)).toEqual([0, 0]);
    expect(where(BOARDS.european, BOARDS.european.start)).toEqual([1, 3]);
    expect(where(BOARDS.european, BOARDS.european.goal)).toEqual([5, 3]);
  });

  it.each(BOARD_IDS)("%s: every symmetry turns jumps into jumps", (id) => {
    const board = BOARDS[id];
    expect(board.symmetries).toHaveLength(id === "triangle" ? 6 : 8);
    const jumps = new Set(board.jumps.map((j) => `${j.from},${j.over},${j.to}`));
    for (const map of board.symmetries) {
      expect(new Set(map).size).toBe(board.holes.length);
      expect(map.every((h) => h >= 0)).toBe(true);
      for (const j of board.jumps) expect(jumps.has(`${map[j.from]},${map[j.over]},${map[j.to]}`)).toBe(true);
    }
    expect(board.symmetries[0]).toEqual(board.holes.map((_, h) => h));
  });

  it.each(BOARD_IDS)("%s: every jump covers three colours in each colouring", (id) => {
    const board = BOARDS[id];
    for (const colours of board.colourings) {
      for (const { from, over, to } of board.jumps) {
        expect(new Set([colours[from], colours[over], colours[to]]).size).toBe(3);
      }
    }
  });
});
