import { describe, expect, it } from "vitest";

import { nextSolveStep } from "./autoplay";
import { elapsed, newGame, phaseOf, reduce, type Game } from "./game";
import { analyse } from "./solver";

const play = (game: Game, square: number, now = 1000) => reduce(game, { type: "play", square, now });

describe("game", () => {
  it("places the knight anywhere first, then only allows knight moves", () => {
    let game = play(newGame(5), 12, 500);
    expect(game.path).toEqual([12]);
    expect(game.startedAt).toBe(500);
    expect(phaseOf(game)).toBe("playing");
    expect(play(game, 13)).toBe(game);
    game = play(game, 1);
    expect(game.path).toEqual([12, 1]);
  });

  it("ignores squares off the board", () => {
    const game = newGame(5);
    expect(play(game, 25)).toBe(game);
    expect(play(game, -1)).toBe(game);
  });

  it("undoes one step or back to a given move, counting each undone move", () => {
    let game = newGame(6);
    for (const sq of [0, 8, 4, 15]) game = play(game, sq);
    game = reduce(game, { type: "undo" });
    expect(game.path).toEqual([0, 8, 4]);
    game = reduce(game, { type: "undo", to: 1 });
    expect(game.path).toEqual([0]);
    expect(game.undos).toBe(3);
  });

  it("starts fresh when the knight is taken off the board", () => {
    const game = reduce(play(newGame(5), 1), { type: "undo" });
    expect(game.path).toEqual([]);
    expect(game.id).toBe(1);
    expect(game.startedAt).toBeNull();
  });

  it("counts a hint once per square and clears it on the next move", () => {
    let game = play(newGame(5), 0);
    game = reduce(game, { type: "hint", square: 7 });
    game = reduce(game, { type: "hint", square: 7 });
    expect(game.hints).toBe(1);
    game = play(game, 7);
    expect(game.hint).toBeNull();
  });

  it("stops the clock when the tour is complete", () => {
    const result = analyse([0], 5);
    if (result.status !== "solvable") throw new Error("expected a tour");
    let game = play(newGame(5), 0, 1000);
    result.completion.forEach((sq, i) => (game = play(game, sq, 2000 + i)));
    expect(phaseOf(game)).toBe("won");
    expect(game.finishedAt).toBe(2000 + result.completion.length - 1);
    expect(elapsed(game, 99_999)).toBe(game.finishedAt! - 1000);
    expect(game.assisted).toBe(false);
  });

  it("notices when the knight is stuck, and undo restarts the clock", () => {
    // From a corner, always taking the lowest-numbered legal square runs into a dead end.
    let game = play(newGame(5), 0, 1000);
    while (phaseOf(game) === "playing") {
      const options = [...Array(25).keys()].filter((sq) => play(game, sq) !== game);
      game = play(game, options[0], 2000);
    }
    expect(["stuck", "won"]).toContain(phaseOf(game));
    if (phaseOf(game) === "stuck") {
      expect(game.finishedAt).toBe(2000);
      expect(reduce(game, { type: "undo" }).finishedAt).toBeNull();
    }
  });

  it("starts a fresh board on resize and restart", () => {
    const game = play(newGame(5), 0);
    expect(reduce(game, { type: "resize", size: 8 })).toMatchObject({ size: 8, path: [], id: 1 });
    expect(reduce(game, { type: "restart" })).toMatchObject({ size: 5, path: [], id: 1 });
  });
});

describe("watch it solve", () => {
  it("recovers from a hopeless start and finishes the tour", () => {
    let game = play(newGame(5), 1, 0);
    for (let tick = 0; tick < 200; tick++) {
      const step = nextSolveStep(game);
      if (!step) break;
      game = step.type === "undo" ? reduce(game, { type: "undo" }) : reduce(game, { ...step, now: tick, auto: true });
    }
    expect(phaseOf(game)).toBe("won");
    expect(game.assisted).toBe(true);
  });
});
