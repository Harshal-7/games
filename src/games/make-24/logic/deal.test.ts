import { describe, expect, it } from "vitest";

import { seeded } from "@/party/logic/random";
import { istDay } from "@/solo/daily";

import { DAILY_LEVELS, dailyHands, dealHand } from "./deal";
import { rate } from "./solver";

describe("dealing", () => {
  it("only deals hands that can be made, at the level asked", () => {
    const rng = seeded(1);
    for (const level of ["easy", "medium", "hard"] as const) {
      for (const top of [9, 13] as const) {
        for (let i = 0; i < 15; i++) {
          const hand = dealHand(level, top, rng);
          expect(hand).toHaveLength(4);
          expect(hand.every((n) => n >= 1 && n <= top)).toBe(true);
          expect(rate(hand)?.level).toBe(level);
        }
      }
    }
  });

  it("skips hands it's told to avoid", () => {
    const rng = seeded(2);
    const avoid = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const hand = dealHand("easy", 9, rng, avoid);
      expect(avoid.has(hand.join(" "))).toBe(false);
      avoid.add(hand.join(" "));
    }
  });
});

describe("the daily five", () => {
  it("is the same on every phone on a day, easy to hard, with no repeats", () => {
    const day = "2026-11-21";
    const hands = dailyHands(day);
    expect(dailyHands(day)).toEqual(hands);
    expect(hands.map((h) => rate(h)?.level)).toEqual(DAILY_LEVELS);
    expect(new Set(hands.map((h) => h.join(" "))).size).toBe(5);
    expect(dailyHands("2026-11-22")).not.toEqual(hands);
  });

  it("is pinned, so no change slips through that would deal phones different hands", () => {
    expect(dailyHands("2026-11-21")).toMatchInlineSnapshot(`
      [
        [
          1,
          6,
          8,
          9,
        ],
        [
          3,
          5,
          7,
          9,
        ],
        [
          2,
          3,
          8,
          9,
        ],
        [
          4,
          6,
          7,
          9,
        ],
        [
          1,
          3,
          4,
          6,
        ],
      ]
    `);
  });

  it("changes at midnight in India", () => {
    expect(dailyHands(istDay(Date.parse("2026-11-21T18:29:59Z")))).toEqual(dailyHands("2026-11-21"));
    expect(dailyHands(istDay(Date.parse("2026-11-21T18:30:00Z")))).toEqual(dailyHands("2026-11-22"));
  });
});
