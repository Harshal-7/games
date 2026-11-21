import { dailyRng } from "@/solo/daily";

import { DAILY_RULES, isCode, MAX_GUESSES, newSecret, score, type Guess, type Rules } from "./code";

/** The notepad's mark on a digit: none, struck out, or ringed in. */
export type Mark = 0 | 1 | 2;

export type Game = {
  mode: "daily" | "practice";
  /** The daily's day ("2026-11-21"); null in Practice. */
  day: string | null;
  rules: Rules;
  secret: string;
  guesses: Guess[];
  /** The guess being typed. */
  typed: string;
  /** The 0–9 notepad. */
  notes: Mark[];
  hints: number;
  /** Practice's Give up: the code is shown and the game counts as not cracked. */
  gaveUp: boolean;
  startedAt: number;
  endedAt: number | null;
};

export type Status = "playing" | "won" | "lost";

export type Action =
  | { type: "type"; digit: string }
  | { type: "delete" }
  | { type: "guess"; now: number }
  | { type: "note"; digit: number }
  /** Types a code that could still be right into the guess row, and counts a hint. */
  | { type: "hint"; code: string }
  | { type: "giveUp"; now: number };

/** Today's code: the same on every phone. */
export function dailySecret(day: string): string {
  return newSecret(DAILY_RULES, dailyRng("crack-the-code", day));
}

export function newGame(
  mode: Game["mode"],
  rules: Rules,
  secret: string,
  day: string | null,
  now: number,
): Game {
  return { mode, day, rules, secret, guesses: [], typed: "", notes: Array(10).fill(0), hints: 0, gaveUp: false, startedAt: now, endedAt: null };
}

export function status(game: Game): Status {
  const last = game.guesses.at(-1);
  if (last && last.right === game.rules.length) return "won";
  if (game.gaveUp) return "lost";
  return game.guesses.length >= MAX_GUESSES ? "lost" : "playing";
}

/** Whether the pad can type this digit now: the row has room and, without repeats, it isn't in the row yet. */
export function canType(game: Game, digit: string): boolean {
  if (game.typed.length >= game.rules.length) return false;
  return game.rules.repeats || !game.typed.includes(digit);
}

export function reduce(game: Game, action: Action): Game {
  if (status(game) !== "playing") return game;
  switch (action.type) {
    case "type":
      if (!/^\d$/.test(action.digit) || !canType(game, action.digit)) return game;
      return { ...game, typed: game.typed + action.digit };
    case "delete":
      return game.typed ? { ...game, typed: game.typed.slice(0, -1) } : game;
    case "guess": {
      if (!isCode(game.typed, game.rules)) return game;
      const guess: Guess = { code: game.typed, ...score(game.secret, game.typed) };
      const next = { ...game, guesses: [...game.guesses, guess], typed: "" };
      return status(next) === "playing" ? next : { ...next, endedAt: action.now };
    }
    case "note": {
      if (!Number.isInteger(action.digit) || action.digit < 0 || action.digit > 9) return game;
      const notes = game.notes.slice();
      notes[action.digit] = ((notes[action.digit] + 1) % 3) as Mark;
      return { ...game, notes };
    }
    case "hint":
      if (!isCode(action.code, game.rules)) return game;
      return { ...game, typed: action.code, hints: game.hints + 1 };
    case "giveUp":
      return { ...game, typed: "", gaveUp: true, endedAt: action.now };
  }
}

const isTime = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;

/**
 * Reads a saved game. The scores are worked out again from the secret, so a broken or
 * edited save can't show wrong clues; anything that doesn't fit the rules drops the game.
 */
export function parseGame(value: unknown): Game | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (v.mode !== "daily" && v.mode !== "practice") return null;
  const rules = v.rules as Rules | undefined;
  if (!rules || ![3, 4, 5].includes(rules.length) || typeof rules.repeats !== "boolean") return null;
  const r: Rules = { length: rules.length, repeats: rules.repeats };
  if (typeof v.secret !== "string" || !isCode(v.secret, r)) return null;
  const day = v.mode === "daily" && typeof v.day === "string" ? v.day : null;
  if (v.mode === "daily" && !day) return null;
  if (!Array.isArray(v.guesses) || v.guesses.length > MAX_GUESSES) return null;
  const guesses: Guess[] = [];
  for (const g of v.guesses as unknown[]) {
    const code = (g as { code?: unknown } | null)?.code;
    if (typeof code !== "string" || !isCode(code, r)) return null;
    guesses.push({ code, ...score(v.secret, code) });
  }
  const typed = typeof v.typed === "string" && /^\d*$/.test(v.typed) && v.typed.length <= r.length ? v.typed : "";
  const notes = Array.from({ length: 10 }, (_, i) => {
    const m = Array.isArray(v.notes) ? (v.notes as unknown[])[i] : 0;
    return (m === 1 || m === 2 ? m : 0) as Mark;
  });
  const hints = typeof v.hints === "number" && Number.isInteger(v.hints) && v.hints >= 0 ? v.hints : 0;
  if (!isTime(v.startedAt)) return null;
  const gaveUp = v.gaveUp === true;
  const game: Game = { mode: v.mode, day, rules: r, secret: v.secret, guesses, typed, notes, hints, gaveUp, startedAt: v.startedAt, endedAt: null };
  if (status(game) !== "playing") game.endedAt = isTime(v.endedAt) ? v.endedAt : v.startedAt;
  return game;
}
