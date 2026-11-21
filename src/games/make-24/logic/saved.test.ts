import { describe, expect, it } from "vitest";

import { newRun } from "./game";
import { EMPTY, parseSaved, reduceSaved } from "./saved";

describe("the save", () => {
  it("starts, plays, quits and keeps the Practice choice", () => {
    let s = reduceSaved(EMPTY, { type: "start", run: newRun("practice", [[1, 2, 3, 4]], "easy", 9, null, 0) });
    s = reduceSaved(s, { type: "tap", slot: 0 });
    expect(s.run?.hand.picked).toBe(0);
    s = reduceSaved(s, { type: "practice", practice: { level: "hard", top: 13 } });
    s = reduceSaved(s, { type: "quit" });
    expect(s).toEqual({ run: null, practice: { level: "hard", top: 13 } });
    expect(reduceSaved(s, { type: "undo" })).toBe(s);
  });

  it("reads back what it wrote, and shrugs off junk", () => {
    const s = reduceSaved(EMPTY, { type: "start", run: newRun("daily", [[1, 2, 3, 4]], "easy", 9, "2026-11-21", 5) });
    expect(parseSaved(JSON.stringify(s))).toEqual(s);
    expect(parseSaved("{}")).toEqual(EMPTY);
    expect(parseSaved(JSON.stringify({ run: { mode: "x" }, practice: { level: "max", top: 99 } }))).toEqual(EMPTY);
    expect(parseSaved("nope")).toBeNull();
  });
});
