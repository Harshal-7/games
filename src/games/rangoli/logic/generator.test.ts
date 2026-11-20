import { describe, expect, it } from "vitest";

import { problems } from "./check";
import { expectedFaces, facesOf } from "./faces";
import { ENDLESS_SIZES, generate, isEndlessSize, type EndlessSize } from "./generator";
import { oddDots, type Pattern } from "./pattern";
import { Solver } from "./solver";

const SEEDS = 80;
const SLOW = 60_000;

/** Every size × seed, made once and shared by the tests. */
let made: { size: EndlessSize; seed: number; pattern: Pattern }[] | null = null;
function patterns() {
  made ??= ENDLESS_SIZES.flatMap((size) =>
    Array.from({ length: SEEDS }, (_, i) => ({ size, seed: i + 1, pattern: generate(size, i + 1) })),
  );
  return made;
}

/** The pattern's lines as text that doesn't depend on numbering or which end comes first. */
function signature(pattern: Pattern, turn: (x: number, y: number) => [number, number], flip: number): string[] {
  const at = (i: number) => {
    const [x, y] = turn(...(pattern.dots[i] as [number, number]));
    return `${Math.round(x * 10)},${Math.round(y * 10)}`;
  };
  return pattern.lines
    .map(({ a, b, bend }) => {
      const [p, q] = [at(a), at(b)];
      const k = Math.round(bend * flip * 1000);
      return p < q ? `${p}>${q}:${k}` : `${q}>${p}:${-k}`;
    })
    .sort();
}

describe("Endless patterns", () => {
  it(
    "are always drawable in one line, and fill in cleanly",
    () => {
      for (const { size, seed, pattern } of patterns()) {
        const where = `${size} #${seed}`;
        expect(problems(pattern), where).toEqual([]);
        expect(oddDots(pattern), where).toEqual([]);
        expect(facesOf(pattern).length, where).toBe(expectedFaces(pattern) - 1);
        expect(new Solver(pattern).solve().lines.length, where).toBe(pattern.lines.length);
      }
    },
    SLOW,
  );

  it("are mirrored four ways: left-right, top-bottom and both diagonals", () => {
    const mirrors: [(x: number, y: number) => [number, number], number][] = [
      [(x, y) => [-x, y], -1],
      [(x, y) => [x, -y], -1],
      [(x, y) => [y, x], -1],
      [(x, y) => [-y, x], 1],
    ];
    for (const { size, seed, pattern } of patterns()) {
      const same = signature(pattern, (x, y) => [x, y], 1);
      for (const [turn, flip] of mirrors) expect(signature(pattern, turn, flip), `${size} #${seed}`).toEqual(same);
    }
  }, SLOW);

  it("grow with the size", () => {
    const ranges = { small: [16, 32], medium: [32, 56], large: [48, 88] } as const;
    for (const { size, pattern } of patterns()) {
      expect(pattern.lines.length).toBeGreaterThanOrEqual(ranges[size][0]);
      expect(pattern.lines.length).toBeLessThanOrEqual(ranges[size][1]);
    }
  }, SLOW);

  it("are the same for the same seed, and differ from seed to seed", () => {
    expect(generate("medium", 42)).toEqual(generate("medium", 42));
    const looks = new Set(Array.from({ length: 40 }, (_, i) => JSON.stringify(generate("small", i + 1))));
    expect(looks.size).toBeGreaterThan(25);
  });

  it("use two or more colours most of the time", () => {
    const all = patterns();
    const many = all.filter(({ pattern }) => new Set(pattern.lines.map((l) => l.tone)).size >= 2).length;
    expect(many / all.length).toBeGreaterThan(0.7);
  }, SLOW);

  it("knows its sizes", () => {
    expect(isEndlessSize("large")).toBe(true);
    expect(isEndlessSize("huge")).toBe(false);
  });
});
