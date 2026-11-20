import { describe, expect, it } from "vitest";

import {
  elapsed,
  hintFor,
  newGame,
  nextSolveStep,
  parseGame,
  patternOf,
  phaseOf,
  placeOf,
  reduce,
  solverOf,
  wrongStart,
  type Action,
  type Game,
  type PatternRef,
} from "./game";
import { PACKS } from "./packs";
import type { Pattern } from "./pattern";

const KALI: PatternRef = { kind: "pack", id: "kali" };
const kali = patternOf(KALI)!;

function play(game: Game, pattern: Pattern, ...actions: Action[]): Game {
  return actions.reduce((g, action) => reduce(g, action, pattern), game);
}

/** The whole drawing, the way the solver would do it. */
function solved(ref: PatternRef, pattern: Pattern, now = 1000): Game {
  const trace = solverOf(pattern).solve();
  let game = reduce(newGame(ref), { type: "start", dot: trace.start! }, pattern);
  trace.lines.forEach((line, i) => (game = reduce(game, { type: "trace", line, now: now + i * 1000 }, pattern)));
  return game;
}

describe("a drawing", () => {
  it("starts on a dot, which can move until the first line", () => {
    let game = play(newGame(KALI), kali, { type: "start", dot: 0 });
    expect(game.start).toBe(0);
    expect(phaseOf(game, kali)).toBe("start");
    game = play(game, kali, { type: "start", dot: 3 });
    expect(game.start).toBe(3);
    expect(play(game, kali, { type: "start", dot: 99 })).toBe(game);
  });

  it("only traces lines from the pen, once each, and starts the clock on the first", () => {
    const solution = solverOf(kali).solve();
    let game = play(newGame(KALI), kali, { type: "start", dot: solution.start! });
    const wrong = kali.lines.findIndex((l) => l.a !== solution.start && l.b !== solution.start);
    expect(play(game, kali, { type: "trace", line: wrong, now: 5 })).toBe(game);
    game = play(game, kali, { type: "trace", line: solution.lines[0], now: 5000 });
    expect(game.lines).toEqual([solution.lines[0]]);
    expect(game.startedAt).toBe(5000);
    expect(phaseOf(game, kali)).toBe("drawing");
    expect(play(game, kali, { type: "trace", line: solution.lines[0], now: 6000 })).toBe(game);
  });

  it("is done when every line is drawn, and stops the clock", () => {
    const game = solved(KALI, kali);
    expect(phaseOf(game, kali)).toBe("done");
    expect(elapsed(game, 999_999)).toBe((kali.lines.length - 1) * 1000);
    expect(play(game, kali, { type: "trace", line: 0, now: 1 })).toBe(game);
  });

  it("warns about a start dot that can't begin it, and gets stuck if drawn from anyway", () => {
    const game = play(newGame(KALI), kali, { type: "start", dot: 0 });
    expect(wrongStart(game, kali)).toBe(true);
    expect(wrongStart(play(game, kali, { type: "start", dot: 3 }), kali)).toBe(false);
    const line = kali.lines.findIndex((l) => l.a === 0 || l.b === 0);
    const drawn = play(game, kali, { type: "trace", line, now: 1 });
    expect(phaseOf(drawn, kali)).toBe("stuck");
    expect(drawn.finishedAt).toBe(1);
    // Stuck: no more lines until it steps back.
    const next = kali.lines.findIndex((l, i) => i !== line && (l.a === drawn.start || l.b === drawn.start));
    expect(play(drawn, kali, { type: "trace", line: next, now: 2 })).toBe(drawn);
  });

  it("undoes a line, or back to a given line, counting each one undone", () => {
    const solution = solverOf(kali).solve();
    let game = play(newGame(KALI), kali, { type: "start", dot: solution.start! });
    for (const line of solution.lines.slice(0, 5)) game = play(game, kali, { type: "trace", line, now: 10 });
    game = play(game, kali, { type: "undo" });
    expect(game.lines).toHaveLength(4);
    game = play(game, kali, { type: "undo", to: 1 });
    expect(game.lines).toHaveLength(1);
    expect(game.undos).toBe(4);
    game = play(game, kali, { type: "undo" }, { type: "undo" });
    expect(game.start).toBeNull();
    expect(game.lines).toEqual([]);
  });

  it("counts each different hint once", () => {
    let game = play(newGame(KALI), kali, { type: "hint", hint: { kind: "start", dots: [3, 10] } });
    game = play(game, kali, { type: "hint", hint: { kind: "start", dots: [3, 10] } });
    expect(game.hints).toBe(1);
    game = play(game, kali, { type: "start", dot: 3 }, { type: "hint", hint: { kind: "line", line: 2 } });
    expect(game.hints).toBe(2);
    expect(play(game, kali, { type: "restart" })).toMatchObject({ id: game.id + 1, hints: 0, start: null });
  });
});

describe("hints", () => {
  it("shows the dots that can start a pattern with two odd dots", () => {
    expect(hintFor(newGame(KALI), kali)).toEqual({ kind: "start", dots: [3, 10] });
    expect(hintFor(play(newGame(KALI), kali, { type: "start", dot: 0 }), kali)).toEqual({ kind: "start", dots: [3, 10] });
  });

  it("shows the first line once the pen is on a good dot, and says go back when stuck", () => {
    const game = play(newGame(KALI), kali, { type: "start", dot: 3 });
    expect(hintFor(game, kali)).toMatchObject({ kind: "line" });
    const line = kali.lines.findIndex((l) => l.a === 0 || l.b === 0);
    const stuck = play(newGame(KALI), kali, { type: "start", dot: 0 }, { type: "trace", line, now: 1 });
    expect(hintFor(stuck, kali)).toEqual({ kind: "back" });
  });
});

describe("Watch it solve", () => {
  it("finishes every hand-made pattern from any state, stepping back out of dead ends", () => {
    for (const pack of PACKS) {
      for (const { id } of pack.patterns) {
        const ref: PatternRef = { kind: "pack", id };
        const pattern = patternOf(ref)!;
        // Start it badly: the first line from dot 0, whatever that does.
        const first = pattern.lines.findIndex((l) => l.a === 0 || l.b === 0);
        let game = play(newGame(ref), pattern, { type: "start", dot: 0 }, { type: "trace", line: first, now: 1 });
        for (let steps = 0; steps < pattern.lines.length * 3; steps++) {
          const step = nextSolveStep(game, pattern);
          if (!step) break;
          game =
            step.type === "start"
              ? reduce(game, { type: "start", dot: step.dot }, pattern)
              : step.type === "undo"
                ? reduce(game, { type: "undo", to: step.to }, pattern)
                : reduce(game, { type: "trace", line: step.line, now: 2, auto: true }, pattern);
        }
        expect(phaseOf(game, pattern), id).toBe("done");
        expect(game.assisted).toBe(true);
      }
    }
  });
});

describe("saved drawings", () => {
  it("come back as they were", () => {
    const solution = solverOf(kali).solve();
    let game = play(newGame(KALI, 4), kali, { type: "start", dot: solution.start! });
    for (const line of solution.lines.slice(0, 6)) game = play(game, kali, { type: "trace", line, now: 1000 });
    const back = parseGame(JSON.parse(JSON.stringify(game)));
    expect(back).toEqual({ ...game, hint: null });
  });

  it("bring back Endless drawings by size and seed", () => {
    const ref: PatternRef = { kind: "endless", size: "small", seed: 77 };
    const game = solved(ref, patternOf(ref)!);
    expect(parseGame(JSON.parse(JSON.stringify(game)))).toEqual(game);
  });

  it("start afresh when they don't fit the pattern, and drop what they can't read", () => {
    expect(parseGame({ ref: KALI, id: 2, start: 3, lines: [999] })).toMatchObject({ id: 2, start: null, lines: [] });
    expect(parseGame({ ref: { kind: "pack", id: "gone" } })).toBeNull();
    expect(parseGame({ ref: { kind: "endless", size: "huge", seed: 1 } })).toBeNull();
    expect(parseGame("nonsense")).toBeNull();
  });
});

describe("placeOf", () => {
  it("knows each pattern's pack, place and the next one, across packs", () => {
    expect(placeOf("phool")).toEqual({ pack: "easy", index: 0, total: 10, next: "aam-patta" });
    const lastEasy = PACKS[0].patterns[9].id;
    expect(placeOf(lastEasy)?.next).toBe(PACKS[1].patterns[0].id);
    expect(placeOf(PACKS[2].patterns[9].id)?.next).toBeNull();
  });
});
