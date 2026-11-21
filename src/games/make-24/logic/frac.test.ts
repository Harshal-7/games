import { describe, expect, it } from "vitest";

import { apply, equals, frac, isWhole, show, TARGET } from "./frac";

describe("exact fractions", () => {
  it("keeps lowest terms with a positive bottom", () => {
    expect(frac(6, 4)).toEqual({ n: 3, d: 2 });
    expect(frac(3, -9)).toEqual({ n: -1, d: 3 });
    expect(frac(0, -5)).toEqual({ n: 0, d: 1 });
    expect(() => frac(1, 0)).toThrow();
  });

  it("does the four signs exactly", () => {
    const third = frac(1, 3);
    expect(apply(third, "+", third)).toEqual(frac(2, 3));
    expect(apply(frac(3), "-", frac(8, 3))).toEqual(frac(1, 3));
    expect(apply(frac(8), "÷", frac(1, 3))).toEqual(TARGET);
    expect(apply(frac(2, 3), "×", frac(3, 4))).toEqual(frac(1, 2));
    expect(apply(frac(5), "÷", frac(0))).toBeNull();
  });

  it("has none of floating point's surprises", () => {
    // In floats 1/3 * 3 and 0.1 + 0.2 aren't what they look like; here they are.
    expect(equals(apply(apply(frac(1), "÷", frac(3))!, "×", frac(3))!, frac(1))).toBe(true);
    expect(equals(apply(frac(1, 10), "+", frac(2, 10))!, frac(3, 10))).toBe(true);
    // 8 ÷ (3 − 8 ÷ 3) is exactly 24; floats make it 23.99999999999999.
    expect(8 / (3 - 8 / 3)).not.toBe(24);
    const r = apply(frac(8), "÷", apply(frac(3), "-", apply(frac(8), "÷", frac(3))!)!)!;
    expect(r).toEqual(TARGET);
  });

  it("shows fractions as fractions", () => {
    expect(show(frac(8, 3))).toBe("8/3");
    expect(show(frac(-1, 3))).toBe("-1/3");
    expect(show(frac(24))).toBe("24");
    expect(isWhole(frac(12, 4))).toBe(true);
  });
});
