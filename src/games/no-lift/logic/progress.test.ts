import { describe, expect, it } from "vitest";

import { bestFor, drawnIn, NO_PROGRESS, parseProgress, recordRun } from "./progress";

const run = (ms: number, runId = ms) => ({ ms, hints: 0, undos: 1, runId });

describe("progress", () => {
  it("keeps the fastest run of each pattern, and ignores the same run twice", () => {
    let progress = recordRun(NO_PROGRESS, { ref: { kind: "pack", id: "diya" }, run: run(60_000) });
    progress = recordRun(progress, { ref: { kind: "pack", id: "diya" }, run: run(70_000) });
    expect(bestFor(progress, { kind: "pack", id: "diya" })?.ms).toBe(60_000);
    const again = recordRun(progress, { ref: { kind: "pack", id: "diya" }, run: run(60_000) });
    expect(again).toBe(progress);
    progress = recordRun(progress, { ref: { kind: "pack", id: "diya" }, run: run(50_000) });
    expect(bestFor(progress, { kind: "pack", id: "diya" })?.ms).toBe(50_000);
    expect(drawnIn(progress, ["diya", "phool"])).toBe(1);
  });

  it("counts Endless patterns per size, once per run", () => {
    const small = { kind: "endless", size: "small", seed: 1 } as const;
    let progress = recordRun(NO_PROGRESS, { ref: small, run: run(30_000, 1) });
    progress = recordRun(progress, { ref: small, run: run(30_000, 1) });
    progress = recordRun(progress, { ref: { ...small, seed: 2 }, run: run(20_000, 2) });
    expect(progress.endless.small).toEqual({ drawn: 2, best: run(20_000, 2), lastRun: 2 });
    expect(bestFor(progress, { kind: "endless", size: "large", seed: 1 })).toBeNull();
  });

  it("survives a reload and drops what it can't read", () => {
    let progress = recordRun(NO_PROGRESS, { ref: { kind: "pack", id: "kali" }, run: run(72_000) });
    progress = recordRun(progress, { ref: { kind: "endless", size: "medium", seed: 9 }, run: run(130_000) });
    expect(parseProgress(JSON.stringify(progress))).toEqual(progress);

    const messy = JSON.stringify({
      best: { kali: run(1000), gone: run(1000), diya: { ms: "fast" } },
      endless: { huge: { drawn: 1 }, small: { drawn: 3, best: null } },
    });
    expect(parseProgress(messy)).toEqual({
      best: { kali: run(1000) },
      endless: { small: { drawn: 3, best: null, lastRun: -1 } },
    });
    expect(parseProgress("{nope")).toBeNull();
    expect(parseProgress(null)).toBeNull();
  });
});
