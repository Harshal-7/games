import { seeded, type Rng } from "@/party/logic/random";

/**
 * Daily puzzles, shared by Crack the code and Make 24: the day in India time, its puzzle
 * number and seed, the share line and the stats. No server: every phone works the same
 * puzzle out from the date, so cousins can compare on WhatsApp.
 *
 * Changing FIRST_DAY, the hash or what a game deals from the seed changes every puzzle
 * for everyone. Tests pin a few days.
 */

/** India is UTC+5:30 all year (no daylight saving), so the day changes at 18:30 UTC. */
const IST_OFFSET_MS = (5 * 60 + 30) * 60_000;
const DAY_MS = 86_400_000;

/** Puzzle #1. */
export const FIRST_DAY = "2026-11-21";

/** "2026-11-21": the date in India at `now` (ms since 1970). */
export function istDay(now: number): string {
  return new Date(now + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** Whole days since 1970-01-01 for a "YYYY-MM-DD" date. */
function dayIndex(day: string): number {
  return Math.round(Date.parse(`${day}T00:00:00Z`) / DAY_MS);
}

/** Days from `from` to `to` (both "YYYY-MM-DD"): 1 for the next day. */
export function daysBetween(from: string, to: string): number {
  return dayIndex(to) - dayIndex(from);
}

/** The puzzle number of a day: #1 on FIRST_DAY. */
export function puzzleNumber(day: string): number {
  return daysBetween(FIRST_DAY, day) + 1;
}

/** Milliseconds until the next midnight in India. */
export function msUntilNextDay(now: number): number {
  return DAY_MS - ((now + IST_OFFSET_MS) % DAY_MS);
}

/** FNV-1a: a small, stable 32-bit hash of a string. */
export function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** The same random numbers on every phone for one game on one day. */
export function dailyRng(game: string, day: string): Rng {
  return seeded(hash(`${game}:${day}`));
}

/** "Crack the code #14 · 5 guesses · 2:14 · no hints". */
export function shareLine(name: string, number: number, parts: readonly string[]): string {
  return [`${name} #${number}`, ...parts].join(" · ");
}

/** "no hints", "1 hint", "3 hints". */
export function hintsText(hints: number): string {
  return hints === 0 ? "no hints" : hints === 1 ? "1 hint" : `${hints} hints`;
}

/** One day's daily result. */
export type DailyResult = {
  day: string;
  won: boolean;
  /** The game's own score: guesses used (Crack the code) or hands made (Make 24). */
  score: number;
  ms: number;
  hints: number;
};

/** A game's daily stats, saved as games:<slug>:stats:v1. */
export type DailyStats = {
  played: number;
  wins: number;
  /** Days in a row won, up to `lastWin`. */
  streak: number;
  bestStreak: number;
  /** The day of the last win, for the streak. */
  lastWin: string | null;
  /** How many results had each score: index = score. */
  dist: number[];
  /** The latest result: today's once it's played. */
  last: DailyResult | null;
};

export function emptyStats(distSize: number): DailyStats {
  return { played: 0, wins: 0, streak: 0, bestStreak: 0, lastWin: null, dist: Array(distSize).fill(0), last: null };
}

/** Today's result, if today's puzzle is done. */
export function playedToday(stats: DailyStats, today: string): DailyResult | null {
  return stats.last?.day === today ? stats.last : null;
}

/** The streak as it stands today: it's broken once a whole day passes without a win. */
export function currentStreak(stats: DailyStats, today: string): number {
  if (!stats.lastWin) return 0;
  return daysBetween(stats.lastWin, today) <= 1 ? stats.streak : 0;
}

/** Stats with a day's result added. A day counts once: a second result for it changes nothing. */
export function recordResult(stats: DailyStats, result: DailyResult): DailyStats {
  if (stats.last && daysBetween(stats.last.day, result.day) <= 0) return stats;
  const dist = stats.dist.slice();
  if (result.score >= 0 && result.score < dist.length) dist[result.score] += 1;
  let { streak, lastWin } = stats;
  if (result.won) {
    streak = lastWin && daysBetween(lastWin, result.day) === 1 ? streak + 1 : 1;
    lastWin = result.day;
  } else {
    streak = 0;
  }
  return {
    played: stats.played + 1,
    wins: stats.wins + (result.won ? 1 : 0),
    streak,
    bestStreak: Math.max(stats.bestStreak, streak),
    lastWin,
    dist,
    last: result,
  };
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const isCount = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0;
const isDay = (v: unknown): v is string => typeof v === "string" && DAY_RE.test(v) && !Number.isNaN(Date.parse(v));

function parseResult(value: unknown): DailyResult | null {
  if (!value || typeof value !== "object") return null;
  const { day, won, score, ms, hints } = value as Record<string, unknown>;
  if (!isDay(day) || typeof won !== "boolean" || !isCount(score) || !isCount(ms) || !isCount(hints)) return null;
  return { day, won, score, ms, hints };
}

/** Reads saved stats, keeping what's usable; anything broken starts that part fresh. */
export function parseStats(raw: string | null, distSize: number): DailyStats | null {
  if (!raw) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!data || typeof data !== "object") return null;
  const v = data as Record<string, unknown>;
  const empty = emptyStats(distSize);
  const played = isCount(v.played) ? v.played : 0;
  const wins = isCount(v.wins) && v.wins <= played ? v.wins : 0;
  const streak = isCount(v.streak) ? v.streak : 0;
  const dist = Array.isArray(v.dist)
    ? empty.dist.map((_, i) => (isCount((v.dist as unknown[])[i]) ? ((v.dist as number[])[i] as number) : 0))
    : empty.dist;
  return {
    played,
    wins,
    streak,
    bestStreak: isCount(v.bestStreak) ? Math.max(v.bestStreak, streak) : streak,
    lastWin: isDay(v.lastWin) ? v.lastWin : null,
    dist,
    last: parseResult(v.last),
  };
}
