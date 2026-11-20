import { describe, expect, it } from "vitest";

import { problems } from "./check";
import { findPattern, PACKS } from "./packs";
import { oddDots } from "./pattern";
import { isValidTrace, Solver } from "./solver";

/** Lines per pattern in each pack. */
const RANGES = { easy: [6, 18], medium: [16, 34], hard: [28, 66] } as const;

describe("the hand-made packs", () => {
  const all = PACKS.flatMap((pack) => pack.patterns.map((entry) => ({ pack: pack.id, ...entry })));

  it("has ten patterns in each pack, with unique ids and names", () => {
    for (const pack of PACKS) expect(pack.patterns, pack.id).toHaveLength(10);
    expect(new Set(all.map((p) => p.id)).size).toBe(all.length);
    expect(new Set(all.map((p) => p.name)).size).toBe(all.length);
    for (const { id, name } of all) {
      expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(name.length, id).toBeLessThanOrEqual(14);
    }
  });

  it("only has patterns a finger can draw in one line", () => {
    for (const { id, pattern } of all) {
      expect(problems(pattern), id).toEqual([]);
      expect([0, 2], id).toContain(oddDots(pattern).length);
    }
  });

  it("keeps each pack's patterns to its size", () => {
    for (const { pack, id, pattern } of all) {
      const [min, max] = RANGES[pack];
      expect(pattern.lines.length, id).toBeGreaterThanOrEqual(min);
      expect(pattern.lines.length, id).toBeLessThanOrEqual(max);
    }
  });

  it("can solve every pattern, the way Watch it solve does", () => {
    for (const { id, pattern } of all) {
      const solver = new Solver(pattern);
      const trace = solver.solve();
      expect(trace.lines.length, id).toBe(pattern.lines.length);
      expect(isValidTrace(pattern, trace), id).toBe(true);
    }
  });

  it("finds a pattern by its id", () => {
    expect(findPattern("diya")).toMatchObject({ pack: "easy", entry: { name: "Diya" } });
    expect(findPattern("nope")).toBeNull();
  });
});
