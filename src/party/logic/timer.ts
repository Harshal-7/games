/**
 * A countdown kept as plain data, so it lives in a game's saved state and survives a
 * reload: a deadline while it runs (hidden pages and locked phones slow intervals down,
 * a deadline doesn't drift), the time left while paused. The ring on screen is
 * ui/ring-timer.tsx.
 */

/** Running when `endsAt` is set; paused with `left` ms to go otherwise. */
export type Timer = { endsAt: number | null; left: number };

export type TimerOp = "pause" | "resume" | "add";

export function timeLeft(timer: Timer, now: number): number {
  return Math.max(0, timer.endsAt === null ? timer.left : timer.endsAt - now);
}

/** The ring takes the game's colour for the last 30 seconds. */
export const HURRY_MS = 30_000;
/** A soft tick each second from 10 down to 1. */
export const TICK_FROM = 10;

export function timerTone(leftMs: number): "calm" | "hurry" {
  return leftMs <= HURRY_MS ? "hurry" : "calm";
}

/** How much of the ring to draw, 0 to 1. +30 sec can push the time left past the total, so it's capped. */
export function ringFraction(leftMs: number, totalMs: number): number {
  return totalMs > 0 ? Math.min(1, Math.max(0, leftMs / totalMs)) : 0;
}

/**
 * Whether the clock should tick now: once as the shown time (whole seconds, rounded
 * up) drops onto each of 10…1. Nothing while paused or when time goes up, and one
 * tick at most when the clock jumps ahead (a background tab waking up).
 */
export function tickDue(prevLeftMs: number, leftMs: number): boolean {
  const shown = Math.ceil(leftMs / 1000);
  return shown < Math.ceil(prevLeftMs / 1000) && shown >= 1 && shown <= TICK_FROM;
}

/** Pause, resume or +30 seconds. */
export function changeTimer(timer: Timer, op: TimerOp, now: number): Timer {
  const left = timeLeft(timer, now);
  if (op === "pause") return { endsAt: null, left };
  if (op === "resume") return left > 0 ? { endsAt: now + left, left } : timer;
  // +30 seconds. A running timer that already hit zero starts again.
  const more = left + 30_000;
  return { endsAt: timer.endsAt === null ? null : now + more, left: more };
}
