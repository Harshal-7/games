import { describe, expect, it } from "vitest";

import {
  currentStreak,
  dailyRng,
  daysBetween,
  emptyStats,
  hash,
  hintsText,
  istDay,
  msUntilNextDay,
  parseStats,
  playedToday,
  puzzleNumber,
  recordResult,
  shareLine,
  type DailyResult,
} from "./daily";

const at = (iso: string) => Date.parse(iso);
const result = (day: string, won: boolean, score = 5): DailyResult => ({ day, won, score, ms: 60_000, hints: 0 });

describe("the day in India", () => {
  it("changes at midnight IST, which is 18:30 UTC", () => {
    expect(istDay(at("2026-11-21T18:29:59.999Z"))).toBe("2026-11-21");
    expect(istDay(at("2026-11-21T18:30:00.000Z"))).toBe("2026-11-22");
    // Just after midnight in India is still the evening before in UTC.
    expect(istDay(at("2026-11-21T00:00:00Z"))).toBe("2026-11-21");
    expect(istDay(at("2026-11-20T19:00:00Z"))).toBe("2026-11-21");
  });

  it("is the same day for a phone anywhere, whatever its clock's time zone", () => {
    // Date.now() is UTC everywhere; only the IST offset decides the day.
    const now = at("2026-12-31T20:00:00Z");
    expect(istDay(now)).toBe("2027-01-01");
  });

  it("counts down to the next midnight in India", () => {
    expect(msUntilNextDay(at("2026-11-21T18:29:00Z"))).toBe(60_000);
    expect(msUntilNextDay(at("2026-11-21T18:30:00Z"))).toBe(86_400_000);
  });

  it("numbers the puzzles from the first day, across months and years", () => {
    expect(puzzleNumber("2026-11-21")).toBe(1);
    expect(puzzleNumber("2026-11-22")).toBe(2);
    expect(puzzleNumber("2026-12-01")).toBe(11);
    expect(puzzleNumber("2027-01-01")).toBe(42);
    expect(daysBetween("2027-02-28", "2027-03-01")).toBe(1);
    expect(daysBetween("2028-02-28", "2028-03-01")).toBe(2);
  });
});

describe("the daily seed", () => {
  it("gives every phone the same numbers for a game and day", () => {
    const a = dailyRng("crack-the-code", "2026-11-21");
    const b = dailyRng("crack-the-code", "2026-11-21");
    const first = [a(), a(), a()];
    expect([b(), b(), b()]).toEqual(first);
  });

  it("differs between days and between games", () => {
    expect(dailyRng("crack-the-code", "2026-11-22")()).not.toBe(dailyRng("crack-the-code", "2026-11-21")());
    expect(dailyRng("make-24", "2026-11-21")()).not.toBe(dailyRng("crack-the-code", "2026-11-21")());
  });

  it("is pinned: changing the hash changes every puzzle for everyone", () => {
    expect(hash("")).toBe(0x811c9dc5);
    expect(hash("crack-the-code:2026-11-21")).toBe(hash("crack-the-code:2026-11-21"));
    expect(hash("a")).toBe(0xe40c292c);
    expect(hash("foobar")).toBe(0xbf9cf968);
  });
});

describe("the share line", () => {
  it("joins the name, number and parts", () => {
    expect(shareLine("Crack the code", 14, ["5 guesses", "2:14", hintsText(0)])).toBe(
      "Crack the code #14 · 5 guesses · 2:14 · no hints",
    );
    expect(shareLine("Make 24", 14, ["5/5", "3:02", hintsText(1)])).toBe("Make 24 #14 · 5/5 · 3:02 · 1 hint");
    expect(hintsText(3)).toBe("3 hints");
  });
});

describe("daily stats", () => {
  it("counts a day once, and knows when today is done", () => {
    const one = recordResult(emptyStats(11), result("2026-11-21", true, 5));
    expect(one).toMatchObject({ played: 1, wins: 1, streak: 1, bestStreak: 1, lastWin: "2026-11-21" });
    expect(one.dist[5]).toBe(1);
    expect(recordResult(one, result("2026-11-21", false))).toBe(one);
    expect(recordResult(one, result("2026-11-20", true))).toBe(one);
    expect(playedToday(one, "2026-11-21")).toEqual(result("2026-11-21", true, 5));
    expect(playedToday(one, "2026-11-22")).toBeNull();
  });

  it("keeps a streak of days in a row won", () => {
    let s = emptyStats(11);
    s = recordResult(s, result("2026-11-21", true));
    s = recordResult(s, result("2026-11-22", true));
    s = recordResult(s, result("2026-11-23", true));
    expect(s.streak).toBe(3);
    s = recordResult(s, result("2026-11-24", false));
    expect(s).toMatchObject({ streak: 0, bestStreak: 3, played: 4, wins: 3 });
    s = recordResult(s, result("2026-11-25", true));
    expect(s.streak).toBe(1);
  });

  it("breaks the streak when a day is skipped", () => {
    let s = recordResult(emptyStats(11), result("2026-11-21", true));
    s = recordResult(s, result("2026-11-22", true));
    expect(currentStreak(s, "2026-11-22")).toBe(2);
    expect(currentStreak(s, "2026-11-23")).toBe(2);
    expect(currentStreak(s, "2026-11-24")).toBe(0);
    s = recordResult(s, result("2026-11-24", true));
    expect(s.streak).toBe(1);
    expect(s.bestStreak).toBe(2);
  });

  it("survives a reload and reads broken saves defensively", () => {
    const s = recordResult(emptyStats(11), result("2026-11-21", true, 4));
    expect(parseStats(JSON.stringify(s), 11)).toEqual(s);
    expect(parseStats(null, 11)).toBeNull();
    expect(parseStats("not json", 11)).toBeNull();
    expect(parseStats("[1,2]", 11)).toMatchObject({ played: 0, last: null });
    const odd = parseStats(JSON.stringify({ played: 3, wins: 9, streak: -1, dist: [1, "x"], last: { day: "21-11-2026" } }), 6);
    expect(odd).toEqual({ ...emptyStats(6), played: 3, dist: [1, 0, 0, 0, 0, 0] });
  });
});
