import { describe, expect, it } from "vitest";

import { BOARDS } from "./boards";
import {
  elapsed,
  legalJumps,
  marblesOf,
  newGame,
  parseGame,
  phaseOf,
  reduce,
  resultOf,
  type Action,
  type Game,
} from "./game";

const board = BOARDS.english;
const at = (row: number, col: number) => board.holes.findIndex((h) => h.row === row && h.col === col);
const jump = (from: [number, number], to: [number, number], now = 1000): Action => ({
  type: "jump",
  from: at(...from),
  to: at(...to),
  now,
});
const play = (game: Game, ...actions: Action[]) => actions.reduce(reduce, game);

describe("game", () => {
  it("starts with every hole full but one", () => {
    const game = newGame("english");
    expect(phaseOf(game)).toBe("start");
    expect(marblesOf(game).filter(Boolean)).toHaveLength(32);
    expect(legalJumps(board, marblesOf(game))).toHaveLength(4);
  });

  it("plays a jump: the marble lands and the one jumped over comes off", () => {
    const game = play(newGame("english"), jump([1, 3], [3, 3], 5000));
    const marbles = marblesOf(game);
    expect(marbles[at(1, 3)]).toBe(false);
    expect(marbles[at(2, 3)]).toBe(false);
    expect(marbles[at(3, 3)]).toBe(true);
    expect(phaseOf(game)).toBe("playing");
    expect(game.startedAt).toBe(5000);
  });

  it("ignores jumps that aren't legal", () => {
    const game = newGame("english");
    expect(play(game, jump([0, 3], [2, 3]))).toBe(game); // lands on a marble
    expect(play(game, jump([2, 2], [4, 4]))).toBe(game); // diagonal
    expect(play(game, jump([3, 3], [1, 3]))).toBe(game); // from the empty hole
  });

  it("undoes one jump, or back to any earlier one, counting each", () => {
    const three = play(newGame("english"), jump([1, 3], [3, 3]), jump([2, 1], [2, 3]), jump([0, 2], [2, 2]));
    const two = play(three, { type: "undo" });
    expect(two.moves).toHaveLength(2);
    expect(two.undos).toBe(1);
    const one = play(three, { type: "undo", to: 1 });
    expect(one.moves).toHaveLength(1);
    expect(one.undos).toBe(2);
    // All the way back is a fresh board with the clock off.
    const fresh = play(three, { type: "undo", to: 0 });
    expect(fresh.moves).toHaveLength(0);
    expect(fresh.startedAt).toBeNull();
    expect(fresh.id).toBe(three.id + 1);
  });

  it("counts each new hint once and clears it on the next jump", () => {
    const hint = { type: "hint", hint: { from: at(1, 3), to: at(3, 3) } } as const;
    const game = play(newGame("english"), hint, hint);
    expect(game.hints).toBe(1);
    expect(play(game, jump([1, 3], [3, 3])).hint).toBeNull();
    expect(play(game, { type: "hint", hint: "back" }).hints).toBe(2);
  });

  it("restarts and switches boards", () => {
    const game = play(newGame("english"), jump([1, 3], [3, 3]));
    expect(play(game, { type: "restart" }).moves).toHaveLength(0);
    const triangle = play(game, { type: "switch", board: "triangle" });
    expect(triangle.board).toBe("triangle");
    expect(marblesOf(triangle).filter(Boolean)).toHaveLength(14);
    expect(play(game, { type: "switch", board: "english" })).toBe(game);
  });

  it("ends when no jump is left, and stops the clock", () => {
    const tri = BOARDS.triangle;
    // Always the first legal jump, which strands marbles long before one is left.
    let game = newGame("triangle");
    let now = 1000;
    while (phaseOf(game) !== "over") {
      const [first] = legalJumps(tri, marblesOf(game));
      game = reduce(game, { type: "jump", from: first.from, to: first.to, now: (now += 1000) });
    }
    expect(game.finishedAt).toBe(now);
    expect(elapsed(game, now + 60_000)).toBe(now - 2000);
    expect(reduce(game, { type: "jump", from: 0, to: 3, now })).toBe(game);
  });

  it("names results", () => {
    const only = (h: number) => board.holes.map((_, i) => i === h);
    expect(resultOf(board, only(at(3, 3))).title).toBe("Perfect");
    expect(resultOf(board, only(at(0, 3))).title).toBe("Solved");
    expect(resultOf(board, board.holes.map((_, i) => i < 2)).title).toBe("So close");
    expect(resultOf(board, board.holes.map((_, i) => i < 5))).toEqual({ kind: "left", left: 5, title: "Marbles left: 5" });
  });

  it("reads back a saved game, and refuses broken saves", () => {
    const game = play(newGame("english", 4), jump([1, 3], [3, 3]), { type: "hint", hint: "back" });
    expect(parseGame(JSON.stringify(game))).toEqual(game);
    expect(parseGame(null)).toBeNull();
    expect(parseGame("{")).toBeNull();
    expect(parseGame(JSON.stringify({ ...game, board: "hexagon" }))).toBeNull();
    // A jump that isn't legal any more: the whole save is dropped.
    expect(parseGame(JSON.stringify({ ...game, moves: [{ from: at(3, 3), to: at(1, 3) }] }))).toBeNull();
    expect(parseGame(JSON.stringify({ ...game, undos: -1 }))).toBeNull();
  });
});
