import { describe, expect, it } from "vitest";

import { istDay } from "@/solo/daily";

import { isCode, MAX_GUESSES } from "./code";
import { canType, dailySecret, newGame, parseGame, reduce, status, type Action, type Game } from "./game";

const RULES = { length: 4, repeats: false } as const;
const start = (secret = "4072") => newGame("practice", RULES, secret, null, 1000);

function play(game: Game, ...codes: string[]): Game {
  for (const code of codes) {
    for (const d of code) game = reduce(game, { type: "type", digit: d });
    game = reduce(game, { type: "guess", now: 5000 });
  }
  return game;
}

describe("a game", () => {
  it("types, deletes and scores a guess", () => {
    let g = start();
    for (const d of "123") g = reduce(g, { type: "type", digit: d });
    g = reduce(g, { type: "delete" });
    expect(g.typed).toBe("12");
    g = reduce(g, { type: "guess", now: 2000 });
    expect(g.guesses).toEqual([]);
    g = play(g, "34");
    expect(g.guesses).toEqual([{ code: "1234", right: 0, near: 2 }]);
    expect(g.typed).toBe("");
  });

  it("keeps a digit out of the row once it's in, unless repeats are on", () => {
    let g = reduce(start(), { type: "type", digit: "4" });
    expect(canType(g, "4")).toBe(false);
    expect(reduce(g, { type: "type", digit: "4" })).toBe(g);
    g = reduce(newGame("practice", { length: 4, repeats: true }, "4472", null, 0), { type: "type", digit: "4" });
    expect(reduce(g, { type: "type", digit: "4" }).typed).toBe("44");
  });

  it("is won on the right code and stops the clock", () => {
    const g = play(start(), "1234", "4072");
    expect(status(g)).toBe("won");
    expect(g.endedAt).toBe(5000);
    expect(reduce(g, { type: "type", digit: "1" })).toBe(g);
  });

  it("is lost after ten wrong guesses", () => {
    const codes = ["1234", "5678", "9012", "3456", "7890", "1357", "2468", "0246", "4027", "4702"];
    let g = play(start(), ...codes.slice(0, MAX_GUESSES - 1));
    expect(status(g)).toBe("playing");
    g = play(g, codes[MAX_GUESSES - 1]);
    expect(status(g)).toBe("lost");
  });

  it("cycles a notepad digit through out, in and clear", () => {
    let g = start();
    const note: Action = { type: "note", digit: 7 };
    g = reduce(g, note);
    expect(g.notes[7]).toBe(1);
    g = reduce(g, note);
    expect(g.notes[7]).toBe(2);
    g = reduce(g, note);
    expect(g.notes[7]).toBe(0);
  });

  it("counts a hint and types its code in", () => {
    const g = reduce(start(), { type: "hint", code: "4052" });
    expect(g).toMatchObject({ typed: "4052", hints: 1 });
    expect(reduce(g, { type: "hint", code: "44" })).toBe(g);
  });
});

describe("the daily code", () => {
  it("is the same for everyone on a day, and follows the daily rules", () => {
    expect(dailySecret("2026-11-21")).toBe(dailySecret("2026-11-21"));
    expect(dailySecret("2026-11-22")).not.toBe(dailySecret("2026-11-21"));
    for (let d = 1; d <= 28; d++) expect(isCode(dailySecret(`2027-02-${String(d).padStart(2, "0")}`), RULES)).toBe(true);
  });

  it("is pinned, so no change slips through that would give phones different codes", () => {
    expect(["2026-11-21", "2026-11-22", "2027-01-01"].map(dailySecret)).toMatchInlineSnapshot(`
      [
        "0918",
        "0316",
        "2470",
      ]
    `);
  });

  it("changes at midnight in India", () => {
    const before = istDay(Date.parse("2026-11-21T18:29:59Z"));
    const after = istDay(Date.parse("2026-11-21T18:30:00Z"));
    expect(dailySecret(before)).toBe(dailySecret("2026-11-21"));
    expect(dailySecret(after)).toBe(dailySecret("2026-11-22"));
  });
});

describe("saves", () => {
  it("come back the same after a reload", () => {
    let g = play(newGame("daily", RULES, "4072", "2026-11-21", 1000), "1234");
    g = reduce(reduce(g, { type: "note", digit: 3 }), { type: "type", digit: "4" });
    expect(parseGame(JSON.parse(JSON.stringify(g)))).toEqual(g);
  });

  it("work the clues out again and drop broken games", () => {
    const g = play(start(), "1234");
    const edited = { ...g, guesses: [{ code: "1234", right: 4, near: 0 }] };
    expect(parseGame(edited)?.guesses).toEqual([{ code: "1234", right: 0, near: 2 }]);
    expect(parseGame({ ...g, secret: "4472" })).toBeNull();
    expect(parseGame({ ...g, mode: "daily", day: null })).toBeNull();
    expect(parseGame({ ...g, guesses: [{ code: "12" }] })).toBeNull();
    expect(parseGame(null)).toBeNull();
    expect(parseGame({ ...g, notes: "x", typed: 5 })).toMatchObject({ notes: Array(10).fill(0), typed: "" });
  });
});
