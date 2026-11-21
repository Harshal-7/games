import { describe, expect, it } from "vitest";

import { frac, TARGET, type Op } from "./frac";
import {
  handState,
  hintFor,
  newHand,
  newRun,
  parseRun,
  reduceHand,
  reduceRun,
  tally,
  type Hand,
  type HandAction,
} from "./game";

/** Card a, the sign, card b; after a merge the new card is already picked, so tapping it again would drop it. */
const merge = (hand: Hand, a: number, op: Op, b: number) =>
  [...(hand.picked === a ? [] : [{ type: "tap", slot: a }]), { type: "op", op }, { type: "tap", slot: b }].reduce(
    (h, act) => reduceHand(h, act as HandAction),
    hand,
  );

describe("a hand", () => {
  it("merges a card, a sign and a card into the second card's slot", () => {
    const h = merge(newHand([3, 3, 8, 8]), 2, "÷", 0);
    expect(h.slots).toEqual([frac(8, 3), frac(3), null, frac(8)]);
    expect(h.picked).toBe(0);
    expect(h.moves).toHaveLength(1);
  });

  it("makes 24 with a fraction on the way, exactly", () => {
    let h = merge(newHand([3, 3, 8, 8]), 2, "÷", 0);
    h = merge(h, 1, "-", 0);
    expect(h.slots[0]).toEqual(frac(1, 3));
    h = merge(h, 3, "÷", 0);
    expect(h.slots).toEqual([TARGET, null, null, null]);
    expect(handState(h)).toBe("made");
    expect(reduceHand(h, { type: "undo" })).toBe(h);
  });

  it("says when the last card isn't 24, and undoes back", () => {
    let h = merge(newHand([1, 2, 3, 4]), 0, "+", 1);
    h = merge(h, 1, "+", 2);
    h = merge(h, 2, "+", 3);
    expect(handState(h)).toBe("wrong");
    h = reduceHand(h, { type: "undo" });
    expect(h.slots).toEqual([null, null, frac(6), frac(4)]);
    h = reduceHand(h, { type: "reset" });
    expect(h.slots).toEqual([1, 2, 3, 4].map((n) => frac(n)));
  });

  it("moves or drops the pick, and ignores ÷ 0", () => {
    let h = reduceHand(newHand([1, 2, 3, 4]), { type: "tap", slot: 0 });
    h = reduceHand(h, { type: "tap", slot: 2 });
    expect(h.picked).toBe(2);
    h = reduceHand(h, { type: "tap", slot: 2 });
    expect(h.picked).toBeNull();
    h = merge(newHand([2, 2, 3, 4]), 0, "-", 1);
    expect(h.slots[1]).toEqual(frac(0));
    expect(merge(h, 2, "÷", 1).slots).toEqual(h.slots);
  });

  it("hints the first step, from here or from the start", () => {
    const h = newHand([3, 3, 8, 8]);
    expect(hintFor(h)).toMatchObject({ step: { op: "÷" }, reset: false });
    const stuck = merge(h, 0, "+", 1);
    expect(hintFor(stuck)?.reset).toBe(true);
    expect(reduceHand(h, { type: "hint" }).hints).toBe(1);
  });

  it("shows the answer and counts the hand as missed", () => {
    const h = reduceHand(newHand([1, 5, 5, 5]), { type: "show" });
    expect(handState(h)).toBe("missed");
    expect(h.slots.filter(Boolean)).toEqual([TARGET]);
  });
});

describe("a run", () => {
  const hands = [[1, 2, 3, 4], [2, 3, 5, 6], [4, 7, 8, 8], [3, 3, 8, 8], [1, 5, 5, 5]];

  it("plays the daily five on one clock and keeps how each went", () => {
    let r = newRun("daily", hands, "easy", 9, "2026-11-21", 1000);
    const solveCurrent = () => {
      for (const act of [{ type: "show" }] as const) r = reduceRun(r, act);
    };
    r = reduceRun(r, { type: "next", now: 2000 });
    expect(r.done).toHaveLength(0);
    r = reduceRun(r, { type: "tap", slot: 0 });
    r = reduceRun(r, { type: "op", op: "×" });
    r = reduceRun(r, { type: "tap", slot: 1 });
    r = reduceRun(r, { type: "op", op: "×" });
    r = reduceRun(r, { type: "tap", slot: 2 });
    r = reduceRun(r, { type: "op", op: "×" });
    r = reduceRun(r, { type: "tap", slot: 3 });
    expect(handState(r.hand)).toBe("made");
    r = reduceRun(r, { type: "next", now: 2000 });
    expect(r.done[0]).toEqual({ numbers: [1, 2, 3, 4], made: true, hints: 0, text: "1 × 2 × 3 × 4" });
    for (let i = 1; i < 5; i++) {
      r = reduceRun(r, { type: "hint" });
      solveCurrent();
      r = reduceRun(r, { type: "next", now: 9000 });
    }
    expect(r.endedAt).toBe(9000);
    expect(tally(r)).toEqual({ made: 1, hints: 4 });
    expect(r.done[3].text).toBe("8 ÷ (3 − 8 ÷ 3)");
  });

  it("deals Practice hands one after another", () => {
    let r = newRun("practice", [[1, 2, 3, 4]], "medium", 13, null, 0);
    r = reduceRun(r, { type: "show" });
    r = reduceRun(r, { type: "next", now: 50, deal: [2, 3, 5, 6] });
    expect(r.hand.numbers).toEqual([2, 3, 5, 6]);
    expect(r.done).toHaveLength(1);
    expect(r.handAt).toBe(50);
  });

  it("comes back the same after a reload, and drops broken saves", () => {
    let r = newRun("daily", hands, "easy", 9, "2026-11-21", 1000);
    r = reduceRun(r, { type: "show" });
    r = reduceRun(r, { type: "next", now: 2000 });
    r = reduceRun(r, { type: "tap", slot: 2 });
    r = reduceRun(r, { type: "op", op: "+" });
    r = reduceRun(r, { type: "tap", slot: 1 });
    const back = parseRun(JSON.parse(JSON.stringify(r)));
    expect(back).toEqual({ ...r, hand: { ...r.hand, picked: null, op: null } });
    expect(parseRun({ ...r, hands: [[0, 1, 2, 3]] })).toBeNull();
    expect(parseRun({ ...r, hand: { ...r.hand, moves: [{ a: 0, op: "+", b: 0 }] } })).toBeNull();
    expect(parseRun({ ...r, mode: "daily", day: null })).toBeNull();
    expect(parseRun("x")).toBeNull();
  });
});
