import { describe, expect, it } from "vitest";

import { apply, equals, frac, TARGET, type Frac, type Op } from "./frac";
import { cardsOf, rate, solve, textOfSteps, type Card } from "./solver";

const OPS: Op[] = ["+", "-", "×", "÷"];

/** Whether any expression makes 24, the long way: each order of the four numbers, each sign, each of the five bracket shapes. */
function bruteAny(nums: number[]): boolean {
  const perms = (xs: number[]): number[][] =>
    xs.length <= 1 ? [xs] : xs.flatMap((x, i) => perms([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p]));
  const f = (a: Frac | null, op: Op, b: Frac | null) => (a && b ? apply(a, op, b) : null);
  for (const [a, b, c, d] of perms(nums).map((p) => p.map((n) => frac(n)))) {
    for (const x of OPS) for (const y of OPS) for (const z of OPS) {
      const shapes = [
        f(f(f(a, x, b), y, c), z, d),
        f(f(a, x, f(b, y, c)), z, d),
        f(a, x, f(f(b, y, c), z, d)),
        f(a, x, f(b, y, f(c, z, d))),
        f(f(a, x, b), y, f(c, z, d)),
      ];
      if (shapes.some((v) => v && equals(v, TARGET))) return true;
    }
  }
  return false;
}

/** Plays a solution's merges on the cards the way the screen does, and gives the last card. */
function play(cards: Card[], steps: { a: number; op: Op; b: number }[]): Frac[] {
  const slots: (Frac | null)[] = [];
  for (const c of cards) slots[c.slot] = c.value;
  for (const s of steps) {
    const r = apply(slots[s.a]!, s.op, slots[s.b]!);
    expect(r).not.toBeNull();
    slots[s.b] = r;
    slots[s.a] = null;
  }
  return slots.filter((v): v is Frac => v !== null);
}

describe("the solver", () => {
  it("finds the classic fraction hands, which have one answer each", () => {
    expect(solve(cardsOf([3, 3, 8, 8])).map((s) => s.text)).toEqual(["8 ÷ (3 − 8 ÷ 3)"]);
    expect(solve(cardsOf([1, 5, 5, 5])).map((s) => s.text)).toEqual(["5 × (5 − 1 ÷ 5)"]);
    expect(solve(cardsOf([3, 3, 7, 7])).map((s) => s.text)).toEqual(["7 × (3 + 3 ÷ 7)"]);
    expect(solve(cardsOf([1, 3, 4, 6])).map((s) => s.text)).toEqual(["6 ÷ (1 − 3 ÷ 4)"]);
    for (const h of [[3, 3, 8, 8], [1, 5, 5, 5], [3, 3, 7, 7], [1, 3, 4, 6]]) {
      expect(solve(cardsOf(h))[0].fraction).toBe(true);
    }
  });

  it("counts answers that only differ by order or grouping once", () => {
    expect(solve(cardsOf([6, 6, 6, 6])).map((s) => s.text).sort()).toEqual(["6 + 6 + 6 + 6", "6 × 6 − 6 − 6"]);
    expect(solve(cardsOf([1, 2, 3, 4])).map((s) => s.text).sort()).toEqual([
      "(1 + 3) × (2 + 4)",
      "1 × 2 × 3 × 4",
      "2 × 3 × 4 ÷ 1",
      "4 × (1 + 2 + 3)",
    ]);
  });

  it("finds an answer exactly when the long way finds one, for every hand of 1 to 9", () => {
    let made = 0;
    for (let a = 1; a <= 9; a++) for (let b = a; b <= 9; b++) for (let c = b; c <= 9; c++) for (let d = c; d <= 9; d++) {
      const hand = [a, b, c, d];
      const found = solve(cardsOf(hand));
      expect(found.length > 0).toBe(bruteAny(hand));
      if (found.length) made++;
      // Every answer is real: its merges, played on the table, leave one card, 24.
      for (const s of found) expect(play(cardsOf(hand), s.steps)).toEqual([TARGET]);
    }
    expect(made).toBe(404);
  }, 30_000);

  it("solves from the middle of a hand, fractions on the table included", () => {
    const table: Card[] = [{ slot: 1, value: frac(3) }, { slot: 2, value: frac(8, 3) }, { slot: 3, value: frac(8) }];
    const [s] = solve(table);
    expect(s.steps[0]).toMatchObject({ a: 1, op: "-", b: 2 });
    expect(play(table, s.steps)).toEqual([TARGET]);
    expect(solve([{ slot: 0, value: frac(3) }, { slot: 1, value: frac(5) }])).toEqual([]);
  });

  it("writes the player's own merges out", () => {
    const steps = [
      { a: 2, op: "+" as const, b: 1, result: frac(7) },
      { a: 1, op: "-" as const, b: 0, result: frac(4) },
    ];
    expect(textOfSteps(cardsOf([3, 2, 5, 6]), steps)).toBe("5 + 2 − 3, 6");
  });
});

describe("difficulty", () => {
  it("follows the solver's counts", () => {
    expect(rate([3, 3, 8, 8])).toEqual({ solutions: 1, fraction: true, division: true, level: "hard" });
    expect(rate([4, 4, 10, 10])).toMatchObject({ solutions: 1, fraction: false, level: "hard" });
    expect(rate([1, 2, 3, 4])).toMatchObject({ solutions: 4, fraction: false, division: false, level: "easy" });
    expect(rate([6, 6, 6, 6])).toMatchObject({ solutions: 2, level: "medium" });
    expect(rate([1, 1, 1, 1])).toBeNull();
  });

  it("splits the hands of 1 to 9 roughly in three", () => {
    const levels = { easy: 0, medium: 0, hard: 0 };
    for (let a = 1; a <= 9; a++) for (let b = a; b <= 9; b++) for (let c = b; c <= 9; c++) for (let d = c; d <= 9; d++) {
      const r = rate([a, b, c, d]);
      if (r) levels[r.level]++;
    }
    expect(levels).toEqual({ easy: 150, medium: 159, hard: 95 });
  }, 30_000);
});
