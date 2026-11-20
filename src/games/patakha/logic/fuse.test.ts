import { describe, expect, it } from "vitest";

import { seeded } from "@/party/logic/random";

import {
  CALM_QUICK,
  CALM_SLOW,
  FASTEST,
  FIRST_TICK,
  FUSE_IDS,
  FUSE_LENGTHS,
  HURRY_MAX,
  HURRY_MIN,
  HURRY_SHARE,
  lightFuse,
  tickGap,
  tickTimes,
} from "./fuse";

describe("fuse lengths", () => {
  it("short 10–25 s, normal 20–50 s, long 30–60 s", () => {
    expect(FUSE_LENGTHS.short).toMatchObject({ min: 10_000, max: 25_000 });
    expect(FUSE_LENGTHS.normal).toMatchObject({ min: 20_000, max: 50_000 });
    expect(FUSE_LENGTHS.long).toMatchObject({ min: 30_000, max: 60_000 });
  });

  it("stays in range and covers the whole range, every setting", () => {
    const rng = seeded(11);
    for (const id of FUSE_IDS) {
      const { min, max } = FUSE_LENGTHS[id];
      const lengths = Array.from({ length: 3000 }, () => lightFuse(id, 0, rng).length);
      expect(Math.min(...lengths), id).toBeGreaterThanOrEqual(min);
      expect(Math.max(...lengths), id).toBeLessThanOrEqual(max);
      // Spread out, not bunched: both ends get close, and the middle isn't favoured.
      const span = max - min;
      expect(Math.min(...lengths), id).toBeLessThan(min + span * 0.02);
      expect(Math.max(...lengths), id).toBeGreaterThan(max - span * 0.02);
      const lowHalf = lengths.filter((l) => l < min + span / 2).length / lengths.length;
      expect(lowHalf, id).toBeGreaterThan(0.45);
      expect(lowHalf, id).toBeLessThan(0.55);
    }
  });

  it("starts as a deadline, the whole length away", () => {
    const fuse = lightFuse("normal", 1_000_000, seeded(1));
    expect(fuse.timer).toEqual({ endsAt: 1_000_000 + fuse.length, left: fuse.length });
  });

  it("speeds up at a random point near the end, never in the first 40% of the fuse", () => {
    const rng = seeded(5);
    const hurries = new Set<number>();
    for (const id of FUSE_IDS) {
      for (let i = 0; i < 1000; i++) {
        const { length, hurry } = lightFuse(id, 0, rng);
        expect(hurry).toBeLessThanOrEqual(HURRY_MAX);
        expect(hurry).toBeLessThanOrEqual(length * HURRY_SHARE);
        expect(hurry).toBeGreaterThanOrEqual(Math.min(HURRY_MIN, length * HURRY_SHARE));
        hurries.add(Math.round(hurry / 1000));
      }
    }
    // Anywhere from 3 to 9 seconds before the end.
    expect([...hurries].sort((a, b) => a - b)).toEqual([3, 4, 5, 6, 7, 8, 9]);
  });
});

describe("ticking", () => {
  const gaps = (times: number[]) => times.slice(1).map((t, i) => times[i] - t);

  it("ticks from just after lighting to just before the bang, always downwards", () => {
    const rng = seeded(9);
    for (let i = 0; i < 300; i++) {
      const fuse = lightFuse(FUSE_IDS[i % 3], 0, rng);
      const times = tickTimes(fuse);
      expect(times[0]).toBe(fuse.length - FIRST_TICK);
      expect(times[times.length - 1]).toBeGreaterThan(0);
      expect(times[times.length - 1]).toBeLessThanOrEqual(FASTEST + 480);
      for (const gap of gaps(times)) expect(gap).toBeGreaterThanOrEqual(FASTEST);
    }
  });

  it("quickens a little while calm, by time burned only", () => {
    // Two fuses of different lengths tick the same way until either one speeds up.
    const a = tickTimes({ length: 60_000, hurry: 5_000 }).map((t) => 60_000 - t);
    const b = tickTimes({ length: 45_000, hurry: 5_000 }).map((t) => 45_000 - t);
    const calm = b.filter((elapsed) => 45_000 - elapsed > 5_000);
    expect(a.slice(0, calm.length)).toEqual(calm);
    const calmGaps = calm.slice(1).map((elapsed, i) => elapsed - calm[i]);
    expect(calmGaps[0]).toBeGreaterThan(CALM_SLOW - 10);
    expect(Math.min(...calmGaps)).toBeGreaterThanOrEqual(CALM_QUICK);
    expect(calmGaps[calmGaps.length - 1]).toBe(CALM_QUICK);
  });

  it("speeds up from the hurry point, never slowing down again", () => {
    const fuse = { length: 40_000, hurry: 8_000 };
    const times = tickTimes(fuse);
    const hurried = times.filter((t) => t <= fuse.hurry);
    const before = gaps(times.filter((t) => t > fuse.hurry));
    const after = gaps(hurried);
    expect(after[0]).toBeLessThan(before[before.length - 1]);
    for (let i = 1; i < after.length; i++) expect(after[i]).toBeLessThanOrEqual(after[i - 1]);
    expect(after[after.length - 1]).toBe(FASTEST);
  });

  it("doesn't always end at the same tempo, so the last ticks aren't a countdown", () => {
    const end = (hurry: number) => tickGap({ length: 30_000, hurry }, 30_000 - 1);
    expect(end(3_000)).toBeGreaterThan(end(9_000));
    expect(end(9_000)).toBe(FASTEST);
  });
});
