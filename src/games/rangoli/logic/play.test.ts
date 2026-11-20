import { describe, expect, it } from "vitest";

import { patternOf, solverOf, type PatternRef } from "./game";
import {
  carryOn,
  changeOptions,
  current,
  DEFAULT_OPTIONS,
  drawingOf,
  NO_PLAY,
  parseOptions,
  parsePlay,
  reducePlay,
  type Play,
  type PlayAction,
} from "./play";

const run = (play: Play, ...actions: PlayAction[]) => actions.reduce(reducePlay, play);
const DIYA: PatternRef = { kind: "pack", id: "diya" };
const KALI: PatternRef = { kind: "pack", id: "kali" };

/** Starts the pattern on a good dot and draws `n` lines of a solution. */
function drawSome(play: Play, ref: PatternRef, n: number): Play {
  const trace = solverOf(patternOf(ref)!).solve();
  return run(
    play,
    { type: "open", ref },
    { type: "game", action: { type: "start", dot: trace.start! } },
    ...trace.lines.slice(0, n).map((line): PlayAction => ({ type: "game", action: { type: "trace", line, now: 1000 } })),
  );
}

describe("play", () => {
  it("opens a pattern on the floor, and goes back to the list keeping the drawing", () => {
    let play = drawSome(NO_PLAY, KALI, 3);
    expect(play.view).toBe("draw");
    expect(current(play)?.lines).toHaveLength(3);
    play = run(play, { type: "list" });
    expect(play.view).toBe("list");
    expect(carryOn(play)?.ref).toEqual(KALI);
    expect(run(play, { type: "carry-on" }).view).toBe("draw");
  });

  it("keeps each pattern's drawing when another is opened", () => {
    let play = drawSome(NO_PLAY, KALI, 4);
    play = drawSome(play, DIYA, 2);
    expect(drawingOf(play, KALI)?.lines).toHaveLength(4);
    play = run(play, { type: "open", ref: KALI });
    expect(current(play)?.lines).toHaveLength(4);
    expect(play.drawings).toHaveLength(2);
  });

  it("starts a finished pattern afresh, and Draw again starts the same one afresh", () => {
    const pattern = patternOf(DIYA)!;
    let play = drawSome(NO_PLAY, DIYA, pattern.lines.length);
    expect(carryOn(play)).toBeNull();
    const finished = current(play)!;
    play = run(play, { type: "list" }, { type: "open", ref: DIYA });
    expect(current(play)).toMatchObject({ lines: [], start: null });
    expect(current(play)!.id).not.toBe(finished.id);
    play = drawSome(play, DIYA, 2);
    play = run(play, { type: "again" });
    expect(current(play)).toMatchObject({ ref: DIYA, lines: [] });
  });

  it("switches to the Endless tab for an Endless pattern", () => {
    const play = run(NO_PLAY, { type: "open", ref: { kind: "endless", size: "small", seed: 5 } });
    expect(play.tab).toBe("endless");
    expect(run(play, { type: "tab", tab: "hard" }).tab).toBe("hard");
  });

  it("comes back after a reload, dropping what it can't read", () => {
    const play = run(drawSome(NO_PLAY, KALI, 5), { type: "tab", tab: "medium" });
    expect(parsePlay(JSON.stringify(play))).toEqual({
      ...play,
      drawings: play.drawings.map((game) => ({ ...game, hint: null })),
    });
    const messy = JSON.stringify({ view: "draw", tab: "nope", drawings: [{ ref: { kind: "pack", id: "gone" } }], nextId: -3 });
    expect(parsePlay(messy)).toEqual({ view: "list", tab: "easy", drawings: [], nextId: 1 });
    expect(parsePlay("{")).toBeNull();
  });
});

describe("options", () => {
  it("has a Sound switch, on unless it was switched off", () => {
    expect(parseOptions(JSON.stringify({ sound: false }))).toEqual({ sound: false });
    expect(parseOptions(JSON.stringify({}))).toEqual(DEFAULT_OPTIONS);
    expect(parseOptions("nope")).toBeNull();
    expect(changeOptions(DEFAULT_OPTIONS, { sound: true })).toBe(DEFAULT_OPTIONS);
    expect(changeOptions(DEFAULT_OPTIONS, { sound: false })).toEqual({ sound: false });
  });
});
