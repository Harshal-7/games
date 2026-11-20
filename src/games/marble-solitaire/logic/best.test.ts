import { describe, expect, it } from "vitest";

import { beats, parseBest, withRun, type Best } from "./best";

const run = (left: number, perfect: boolean, ms: number): Best => ({ left, perfect, ms, hints: 0, runId: ms });

describe("best results", () => {
  it("ranks fewest marbles, then Perfect, then the faster", () => {
    expect(beats(run(2, false, 90_000), run(3, false, 10_000))).toBe(true);
    expect(beats(run(1, true, 90_000), run(1, false, 10_000))).toBe(true);
    expect(beats(run(1, false, 10_000), run(1, true, 90_000))).toBe(false);
    expect(beats(run(1, true, 50_000), run(1, true, 60_000))).toBe(true);
    expect(beats(run(1, true, 60_000), run(1, true, 60_000))).toBe(false);
  });

  it("keeps one best per board", () => {
    const table = withRun({}, "english", run(3, false, 1000));
    expect(withRun(table, "english", run(4, false, 500))).toBe(table);
    expect(withRun(table, "triangle", run(4, false, 500)).triangle?.left).toBe(4);
  });

  it("reads saves defensively", () => {
    expect(parseBest(JSON.stringify({ english: run(1, true, 2000) }))).toEqual({ english: run(1, true, 2000) });
    expect(parseBest(JSON.stringify({ english: { left: 0, perfect: true, ms: 1, hints: 0, runId: 1 }, square: run(1, true, 2) }))).toEqual({});
    expect(parseBest("nonsense")).toEqual({});
  });
});
