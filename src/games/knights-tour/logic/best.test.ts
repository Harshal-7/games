import { describe, expect, it } from "vitest";

import { parseBest, withRun } from "./best";

const run = (ms: number) => ({ ms, undos: 1, hints: 0, runId: ms });

describe("best times", () => {
  it("keeps the faster run", () => {
    const table = withRun({}, 6, run(5000));
    expect(withRun(table, 6, run(6000))).toBe(table);
    expect(withRun(table, 6, run(5000))).toBe(table);
    expect(withRun(table, 6, run(4000))[6]?.ms).toBe(4000);
    expect(withRun(table, 7, run(9000))).toEqual({ 6: run(5000), 7: run(9000) });
  });

  it("reads saved times and drops anything broken", () => {
    expect(parseBest(null)).toEqual({});
    expect(parseBest("not json")).toEqual({});
    expect(parseBest(JSON.stringify({ 5: run(3000), 9: run(1), 6: { ms: "fast" }, 7: { ...run(2), ms: -1 } }))).toEqual({
      5: run(3000),
    });
  });
});
