import { describe, expect, it } from "vitest";

import { Draw } from "./draw";
import { expectedFaces, facesOf } from "./faces";
import { PACKS } from "./packs";

describe("facesOf", () => {
  it("finds the inside of a square, and none for a single line", () => {
    const d = new Draw();
    d.path([d.dot(0, 0), d.dot(10, 0), d.dot(10, 10), d.dot(0, 10)], 2, true);
    expect(facesOf(d.done())).toEqual([{ path: expect.stringMatching(/^M.*Z$/), tone: 2 }]);

    const line = new Draw();
    line.line(line.dot(0, 0), line.dot(10, 0), 0);
    expect(facesOf(line.done())).toEqual([]);
  });

  it("fills a petal, and splits a square cut by its diagonal in two", () => {
    const petal = new Draw();
    petal.petal(petal.dot(0, 0), petal.dot(10, 0), 3);
    expect(facesOf(petal.done())).toHaveLength(1);

    const d = new Draw();
    const corners = [d.dot(0, 0), d.dot(10, 0), d.dot(10, 10), d.dot(0, 10)];
    d.path(corners, 0, true).line(corners[0], corners[2], 1);
    expect(facesOf(d.done())).toHaveLength(2);
  });

  it("colours a face by the tone most of its edge has", () => {
    const d = new Draw();
    const [a, b, c] = [d.dot(0, 0), d.dot(10, 0), d.dot(5, 8)];
    d.line(a, b, 4).line(b, c, 4).line(c, a, 1);
    expect(facesOf(d.done())[0].tone).toBe(4);
  });

  it("finds every face of every hand-made pattern (Euler's formula)", () => {
    for (const pack of PACKS) {
      for (const { id, pattern } of pack.patterns) {
        expect(facesOf(pattern).length, id).toBe(expectedFaces(pattern) - 1);
      }
    }
  });
});
