import { describe, expect, it } from "vitest";

import { circleBend, Draw } from "./draw";
import { degrees, isConnected, linePath, oddDots, segmentsCross, shapeOf, type Pattern } from "./pattern";

const twoDots = (bend: number): Pattern => ({
  dots: [
    [0, 0],
    [10, 0],
  ],
  lines: [{ a: 0, b: 1, bend, tone: 0 }],
});

describe("shapeOf", () => {
  it("runs a straight line from a to b", () => {
    const shape = shapeOf(twoDots(0), twoDots(0).lines[0]);
    expect(shape.length).toBe(10);
    expect(shape.at(0.5)).toEqual([5, 0]);
    expect(linePath(shape)).toBe("M0 0L10 0");
    expect(linePath(shape, true)).toBe("M10 0L0 0");
  });

  it("bulges a positive bend to the left of a→b on screen (up, for a line going right)", () => {
    const shape = shapeOf(twoDots(0.5), twoDots(0.5).lines[0]);
    const [x, y] = shape.at(0.5);
    expect(x).toBeCloseTo(5);
    expect(y).toBeCloseTo(-5);
    // A half circle of radius 5.
    expect(shape.length).toBeCloseTo(5 * Math.PI);
    expect(shape.at(0)).toEqual([0, 0]);
    expect(shape.at(1)).toEqual([10, 0]);
  });

  it("bulges a negative bend the other way, and the path's sweep flag follows", () => {
    const up = shapeOf(twoDots(0.3), twoDots(0.3).lines[0]);
    const down = shapeOf(twoDots(-0.3), twoDots(-0.3).lines[0]);
    expect(up.at(0.5)[1]).toBeCloseTo(-3);
    expect(down.at(0.5)[1]).toBeCloseTo(3);
    expect(linePath(up)).toMatch(/ 0 0 1 10 0$/);
    expect(linePath(down)).toMatch(/ 0 0 0 10 0$/);
    // Drawn backwards, the same arc flips its sweep.
    expect(linePath(up, true)).toMatch(/ 0 0 0 0 0$/);
  });

  it("keeps points evenly spaced along an arc", () => {
    const shape = shapeOf(twoDots(0.4), twoDots(0.4).lines[0]);
    const steps = [0, 0.25, 0.5, 0.75, 1].map((t) => shape.at(t));
    const gaps = steps.slice(1).map((p, i) => Math.hypot(p[0] - steps[i][0], p[1] - steps[i][1]));
    for (const gap of gaps) expect(gap).toBeCloseTo(gaps[0], 6);
  });
});

describe("circleBend", () => {
  it("makes the arc between two dots of a circle run along that circle", () => {
    const pattern: Pattern = {
      dots: [
        [0, -10],
        [10, 0],
      ],
      lines: [{ a: 0, b: 1, bend: circleBend([0, -10], [10, 0], [0, 0]), tone: 0 }],
    };
    const shape = shapeOf(pattern, pattern.lines[0]);
    for (const t of [0.2, 0.5, 0.8]) {
      const [x, y] = shape.at(t);
      expect(Math.hypot(x, y)).toBeCloseTo(10);
    }
  });
});

describe("degrees, odd dots and connection", () => {
  it("counts the lines at each dot", () => {
    const d = new Draw();
    const [a, b, c] = [d.dot(0, 0), d.dot(10, 0), d.dot(0, 10)];
    d.path([a, b, c], 0).petal(a, b, 1);
    const pattern = d.done();
    expect(degrees(pattern)).toEqual([3, 4, 1]);
    expect(oddDots(pattern)).toEqual([0, 2]);
    expect(isConnected(pattern)).toBe(true);
  });

  it("spots a pattern in two pieces", () => {
    const d = new Draw();
    d.petal(d.dot(0, 0), d.dot(10, 0), 0).petal(d.dot(30, 0), d.dot(40, 0), 0);
    expect(isConnected(d.done())).toBe(false);
  });

  it("fits a pattern to the -50 to 50 box, curves included", () => {
    const d = new Draw();
    d.line(d.dot(0, 0), d.dot(10, 0), 0, 0.5);
    const { dots } = d.done();
    expect(dots).toEqual([
      [-50, 25],
      [50, 25],
    ]);
  });
});

describe("segmentsCross", () => {
  it("finds a crossing, and two segments that only touch at a sample point", () => {
    expect(segmentsCross([0, 0], [10, 10], [0, 10], [10, 0])).toBe(true);
    // Two diagonals of a square, each cut at its middle: the halves touch there.
    expect(segmentsCross([0, 0], [5, 5], [5, 5], [10, 0])).toBe(true);
    expect(segmentsCross([0, 0], [5, 5], [0, 10], [4, 6])).toBe(false);
    expect(segmentsCross([0, 0], [10, 0], [0, 1], [10, 1])).toBe(false);
  });
});
