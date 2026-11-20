import { describe, expect, it } from "vitest";

import {
  checkTake,
  levelGain,
  levelled,
  loudness,
  MAX_GAIN,
  reversed,
  seconds,
  SILENT_LEVEL,
  softLimit,
  TARGET_LEVEL,
  toMono,
  trimSilence,
  type Clip,
} from "./audio";

const RATE = 8000;

/** A sine "voice" of `amp` for `length` seconds, with `before` and `after` seconds of quiet hiss. */
function sung(amp: number, length: number, before = 0, after = 0, hiss = 0.0005): Clip {
  const n = Math.round((before + length + after) * RATE);
  const samples = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    const voice = t >= before && t < before + length ? amp * Math.sin(2 * Math.PI * 220 * t) : 0;
    samples[i] = voice + hiss * Math.sin(i * 12.9898);
  }
  return { samples, rate: RATE };
}

describe("reversed", () => {
  it("is back to front, in a new array, and twice gives the original", () => {
    const samples = Float32Array.from([0.1, -0.2, 0.3, 0.4]);
    const back = reversed(samples);
    expect([...back]).toEqual([...Float32Array.from([0.4, 0.3, -0.2, 0.1])]);
    expect(back).not.toBe(samples);
    expect([...reversed(back)]).toEqual([...samples]);
  });

  it("handles empty and one-sample recordings", () => {
    expect(reversed(new Float32Array(0)).length).toBe(0);
    expect([...reversed(Float32Array.from([0.5]))]).toEqual([0.5]);
  });
});

describe("toMono", () => {
  it("averages channels, to the shortest one", () => {
    const mono = toMono([Float32Array.from([1, 0, 0.5]), Float32Array.from([0, 0, 0.5, 9])]);
    expect([...mono]).toEqual([0.5, 0, 0.5]);
  });

  it("copies a single channel", () => {
    const one = Float32Array.from([0.25]);
    const mono = toMono([one]);
    expect([...mono]).toEqual([0.25]);
    expect(mono).not.toBe(one);
  });
});

describe("loudness", () => {
  it("finds the peak, and a level that ignores one loud click", () => {
    const clip = sung(0.2, 2);
    clip.samples[100] = 0.95;
    const { peak, level } = loudness(clip.samples);
    expect(peak).toBeCloseTo(0.95, 2);
    expect(level).toBeGreaterThan(0.18);
    expect(level).toBeLessThan(0.21);
  });

  it("is zero for silence", () => {
    expect(loudness(new Float32Array(100))).toEqual({ peak: 0, level: 0 });
  });
});

describe("trimSilence", () => {
  it("cuts the quiet ends, keeping a short lead-in and tail", () => {
    const clip = trimSilence(sung(0.3, 3, 1, 2));
    expect(seconds(clip)).toBeGreaterThan(3);
    expect(seconds(clip)).toBeLessThan(3 + 0.08 + 0.15 + 0.05);
  });

  it("gives back nothing for a recording with no sound", () => {
    expect(trimSilence(sung(0, 0, 2, 0, 0.001)).samples.length).toBe(0);
  });

  it("keeps a quiet singer", () => {
    const clip = trimSilence(sung(0.02, 4, 0.5, 0.5));
    expect(seconds(clip)).toBeGreaterThan(4);
  });
});

describe("levelling", () => {
  it("turns a quiet take up to the target level", () => {
    const quiet = sung(0.05, 2);
    const out = levelled(quiet.samples, RATE);
    const { level, peak } = loudness(out);
    expect(level).toBeGreaterThan(TARGET_LEVEL * 0.9);
    expect(peak).toBeLessThan(1);
  });

  it("turns a loud take down, and never goes past full scale", () => {
    const loud = sung(0.99, 2);
    expect(levelGain(loud.samples)).toBeLessThan(1);
    const out = levelled(loud.samples, RATE, 5);
    expect(loudness(out).peak).toBeLessThan(1);
  });

  it("caps how far it turns up a near-silent take", () => {
    const whisper = sung(0.001, 2, 0, 0, 0);
    expect(levelGain(whisper.samples)).toBe(MAX_GAIN);
  });

  it("fades both ends so a cut never clicks", () => {
    const out = levelled(new Float32Array(1000).fill(0.5), RATE, 1);
    expect(out[0]).toBe(0);
    expect(out[999]).toBe(0);
    expect(out[500]).toBeCloseTo(0.5);
  });

  it("rounds off peaks smoothly", () => {
    expect(softLimit(0.5)).toBe(0.5);
    expect(softLimit(-0.8)).toBe(-0.8);
    expect(softLimit(3)).toBeLessThan(1);
    expect(softLimit(-3)).toBeGreaterThan(-1);
    expect(softLimit(0.9)).toBeLessThan(0.9);
    expect(softLimit(0.9)).toBeGreaterThan(0.8);
  });
});

describe("checkTake", () => {
  it("passes a whole line, trimmed", () => {
    const check = checkTake(sung(0.3, 5, 0.5, 1), 2);
    expect(check.kind).toBe("ok");
    if (check.kind === "ok") expect(seconds(check.clip)).toBeLessThan(5.5);
  });

  it("calls a short burst short, with its length", () => {
    const check = checkTake(sung(0.3, 1, 1, 3), 2);
    expect(check.kind).toBe("short");
    if (check.kind === "short") expect(check.seconds).toBeLessThan(1.5);
  });

  it("calls nothing heard silent", () => {
    expect(checkTake(sung(SILENT_LEVEL / 4, 4), 2).kind).toBe("silent");
  });
});
