import type { Rng } from "@/party/logic/random";
import type { Timer } from "@/party/logic/timer";

/**
 * The hidden fuse. How long it burns is random every round and never shown: no number,
 * no drawing that burns down. All anyone gets is the ticking, which quickens a little the
 * longer it burns, then much faster from a random point near the end, so it never counts
 * down exactly.
 */

export type FuseLength = "short" | "normal" | "long";

export const FUSE_LENGTHS: Record<FuseLength, { label: string; min: number; max: number }> = {
  short: { label: "Short", min: 10_000, max: 25_000 },
  normal: { label: "Normal", min: 20_000, max: 50_000 },
  long: { label: "Long", min: 30_000, max: 60_000 },
};

export const FUSE_IDS = Object.keys(FUSE_LENGTHS) as FuseLength[];

export function isFuseLength(value: unknown): value is FuseLength {
  return FUSE_IDS.includes(value as FuseLength);
}

/** The ticking speeds up somewhere in the last 3 to 9 seconds… */
export const HURRY_MIN = 3_000;
export const HURRY_MAX = 9_000;
/** …but never before the last 60% of the fuse, so even a short one starts calm. */
export const HURRY_SHARE = 0.6;

export type Fuse = {
  /** How long it burns in all, in ms. Hidden. */
  length: number;
  /** The time left when the ticking speeds up, in ms. Hidden. */
  hurry: number;
  /** A deadline while it burns, the time left while paused. */
  timer: Timer;
};

export function lightFuse(setting: FuseLength, now: number, rng: Rng): Fuse {
  const { min, max } = FUSE_LENGTHS[setting];
  const length = Math.round(min + rng() * (max - min));
  const hurry = Math.floor(Math.min(length * HURRY_SHARE, HURRY_MIN + rng() * (HURRY_MAX - HURRY_MIN)));
  return { length, hurry, timer: { endsAt: now + length, left: length } };
}

/* ---------- The ticking ---------- */

/** The first tick comes just after the fizz of lighting it. */
export const FIRST_TICK = 350;
/** Calm: one tick a second, quickening to one every 0.7 s over half a minute. It goes by the
    time burned only, so it says nothing about how much is left. */
export const CALM_SLOW = 1_000;
export const CALM_QUICK = 700;
const CALM_RAMP = 30_000;
/** From the speed-up: the gap between ticks halves every 2.5 s, down to the fastest. */
const HURRY_GAP = 480;
const HURRY_HALVES = 2_500;
export const FASTEST = 110;

/** The gap after a tick `elapsed` ms into the fuse. */
export function tickGap(fuse: Pick<Fuse, "length" | "hurry">, elapsed: number): number {
  const left = fuse.length - elapsed;
  if (left > fuse.hurry) {
    const quickened = Math.min(1, elapsed / CALM_RAMP);
    return Math.round(CALM_SLOW + (CALM_QUICK - CALM_SLOW) * quickened);
  }
  const hurried = fuse.hurry - left;
  return Math.max(FASTEST, Math.round(HURRY_GAP * 0.5 ** (hurried / HURRY_HALVES)));
}

/** When the ticks sound, as the time left on the fuse (ms), from the first tick down. */
export function tickTimes(fuse: Pick<Fuse, "length" | "hurry">): number[] {
  const times: number[] = [];
  for (let elapsed = FIRST_TICK; elapsed < fuse.length; elapsed += tickGap(fuse, elapsed)) {
    times.push(fuse.length - elapsed);
  }
  return times;
}
