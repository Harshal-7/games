import { describe, expect, it } from "vitest";

import { Draw } from "./draw";
import { between, Tracks } from "./follow";
import { patternOf } from "./game";
import { samples, shapeOf, type Pattern, type Point } from "./pattern";

/** A petal (lines 0 and 1, upper and lower) and a straight line (2) between the same two dots, plus a tail (3). */
function petalAndStem(): Pattern {
  const d = new Draw();
  const a = d.dot(-40, 0);
  const b = d.dot(40, 0);
  d.petal(a, b, 0, 0.3).line(a, b, 1).line(b, d.dot(40, 40), 2);
  return d.done();
}

/** Points along line i from dot `from`, as a finger would draw them, nudged a little off the line. */
function finger(pattern: Pattern, line: number, from: number, upTo = 1, wobble = 1.5): Point[] {
  const shape = shapeOf(pattern, pattern.lines[line]);
  const points = samples(shape, 20).filter((_, i) => i / 20 <= upTo);
  if (pattern.lines[line].a !== from) points.reverse();
  return points.map(([x, y], i) => [x + (i % 2 ? wobble : -wobble), y + (i % 3 ? wobble : 0)] as const);
}

describe("Tracks", () => {
  const pattern = petalAndStem();
  const tracks = new Tracks(pattern);
  const a = 0;

  it("finds the dot under a finger, within the radius", () => {
    const [x, y] = pattern.dots[1];
    expect(tracks.dotAt([x + 3, y - 2], 7)).toBe(1);
    expect(tracks.dotAt([x + 9, y], 7)).toBeNull();
  });

  it("tells the two sides of a petal and the straight line apart by the finger's path", () => {
    const open = [0, 1, 2];
    for (const line of open) {
      const stroke = finger(pattern, line, a);
      expect(tracks.arrived(a, open, stroke, 6, 8)).toBe(line);
      expect(tracks.following(a, open, stroke.slice(0, 8), 8)?.line).toBe(line);
    }
  });

  it("says how far along the line the finger has got", () => {
    const stroke = finger(pattern, 0, a, 0.5, 0);
    const at = tracks.following(a, [0, 1, 2], stroke, 8);
    expect(at?.line).toBe(0);
    expect(at!.t).toBeCloseTo(0.5, 1);
  });

  it("doesn't draw a line the finger cut across to get to its dot", () => {
    // Straight across, under the lower side of the petal: that's the straight line, not a side.
    const across = finger(pattern, 2, a);
    expect(tracks.arrived(a, [0, 1], across, 6, 4)).toBeNull();
  });

  it("only draws open lines, and only on arriving at their far dot", () => {
    const stroke = finger(pattern, 0, a, 0.7);
    expect(tracks.arrived(a, [0, 1, 2], stroke, 6, 8)).toBeNull();
    expect(tracks.arrived(a, [1, 2], finger(pattern, 0, a), 6, 4)).toBeNull();
  });

  it("follows each line of every Easy pattern from either end", () => {
    for (const id of ["phool", "aam-patta", "diya", "patang", "titli", "machli", "chowk", "tara", "paan", "kali"]) {
      const easy = patternOf({ kind: "pack", id })!;
      const t = new Tracks(easy);
      easy.lines.forEach((line, i) => {
        for (const from of [line.a, line.b]) {
          const open = easy.lines.flatMap((l, k) => (l.a === from || l.b === from ? [k] : []));
          expect(t.arrived(from, open, finger(easy, i, from), 5, 6), `${id} line ${i}`).toBe(i);
        }
      });
    }
  });
});

describe("between", () => {
  it("fills in a fast swipe with points no further apart than the step", () => {
    const points = between([0, 0], [10, 0], 3);
    expect(points).toHaveLength(4);
    expect(points[points.length - 1]).toEqual([10, 0]);
    expect(between([0, 0], [1, 0], 3)).toEqual([[1, 0]]);
  });
});
