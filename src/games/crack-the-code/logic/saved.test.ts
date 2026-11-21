import { describe, expect, it } from "vitest";

import { newGame } from "./game";
import { EMPTY, parseSaved, reduceSaved } from "./saved";

describe("the save", () => {
  it("starts, plays, quits and keeps the Practice choice", () => {
    const game = newGame("practice", { length: 3, repeats: true }, "112", null, 0);
    let s = reduceSaved(EMPTY, { type: "start", game });
    s = reduceSaved(s, { type: "type", digit: "1" });
    expect(s.game?.typed).toBe("1");
    s = reduceSaved(s, { type: "practice", rules: { length: 5, repeats: true } });
    s = reduceSaved(s, { type: "quit" });
    expect(s).toEqual({ game: null, practice: { length: 5, repeats: true } });
    expect(reduceSaved(s, { type: "delete" })).toBe(s);
  });

  it("reads back what it wrote, and shrugs off junk", () => {
    const game = newGame("daily", { length: 4, repeats: false }, "4072", "2026-11-21", 5);
    const s = reduceSaved(EMPTY, { type: "start", game });
    expect(parseSaved(JSON.stringify(s))).toEqual(s);
    expect(parseSaved("{}")).toEqual(EMPTY);
    expect(parseSaved(JSON.stringify({ game: { mode: "x" }, practice: { length: 7 } }))).toEqual(EMPTY);
    expect(parseSaved("nope")).toBeNull();
  });
});
