import { reduce, parseGame, type Action, type Game } from "./game";
import type { Rules } from "./code";

/** What's kept in this browser: the game on screen (or none: the start screen) and the Practice choice. */
export type Saved = { game: Game | null; practice: Rules };

export type SavedAction = Action | { type: "start"; game: Game } | { type: "quit" } | { type: "practice"; rules: Rules };

export const SAVE_KEY = "games:crack-the-code:game:v1";
export const STATS_KEY = "games:crack-the-code:stats:v1";
export const OPTIONS_KEY = "games:crack-the-code:options:v1";
/** Stats' distribution: index = guesses used to crack it (1 to 10); 0 counts the days not cracked. */
export const DIST_SIZE = 11;

export const EMPTY: Saved = { game: null, practice: { length: 4, repeats: false } };

export function reduceSaved(saved: Saved, action: SavedAction): Saved {
  switch (action.type) {
    case "start":
      return { ...saved, game: action.game };
    case "quit":
      return saved.game ? { ...saved, game: null } : saved;
    case "practice": {
      const { length, repeats } = action.rules;
      if (length === saved.practice.length && repeats === saved.practice.repeats) return saved;
      return { ...saved, practice: { length, repeats } };
    }
    default: {
      if (!saved.game) return saved;
      const game = reduce(saved.game, action);
      return game === saved.game ? saved : { ...saved, game };
    }
  }
}

export function parseSaved(raw: string | null): Saved | null {
  let v: unknown;
  try {
    v = JSON.parse(raw ?? "null");
  } catch {
    return null;
  }
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const p = o.practice as Partial<Rules> | undefined;
  const practice: Rules =
    p && (p.length === 3 || p.length === 4 || p.length === 5) && typeof p.repeats === "boolean"
      ? { length: p.length, repeats: p.repeats }
      : EMPTY.practice;
  return { game: parseGame(o.game), practice };
}
