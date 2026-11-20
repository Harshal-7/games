import { newGame, parseGame, patternOf, phaseOf, reduce, refKey, type Action, type Game, type PatternRef } from "./game";
import type { PackId } from "./packs";

/**
 * Everything Rangoli keeps between visits, apart from best times: which screen is up,
 * the tab on the pattern list, and the drawings under way. Every pattern keeps its own
 * drawing, so opening another one never throws work away. Saved as
 * games:rangoli:play:v1, so a reload comes back to the same screen.
 */
export type Tab = PackId | "endless";

export const TABS: readonly Tab[] = ["easy", "medium", "hard", "endless"];

export type Play = {
  view: "list" | "draw";
  tab: Tab;
  /** Drawings, oldest first; the last is the one on the floor. */
  drawings: readonly Game[];
  /** The id the next fresh drawing gets. */
  nextId: number;
};

export const NO_PLAY: Play = { view: "list", tab: "easy", drawings: [], nextId: 1 };

/** How many drawings are kept; the oldest go first. */
const KEEP = 12;

export type PlayAction =
  | { type: "tab"; tab: Tab }
  /** Back to the pattern list; the drawing stays. */
  | { type: "list" }
  /** Open a pattern: its drawing under way, or a fresh one. */
  | { type: "open"; ref: PatternRef }
  /** Back to the drawing on the floor. */
  | { type: "carry-on" }
  /** A fresh drawing of the same pattern. */
  | { type: "again" }
  | { type: "game"; action: Action };

export function current(play: Play): Game | null {
  return play.drawings[play.drawings.length - 1] ?? null;
}

/** The drawing Carry on goes back to: under way, not finished. */
export function carryOn(play: Play): Game | null {
  const game = current(play);
  if (!game || game.lines.length === 0) return null;
  const pattern = patternOf(game.ref);
  return pattern && phaseOf(game, pattern) !== "done" ? game : null;
}

/** The drawing under way for a pattern, if there is one. */
export function drawingOf(play: Play, ref: PatternRef): Game | null {
  const key = refKey(ref);
  return play.drawings.find((game) => refKey(game.ref) === key) ?? null;
}

export function reducePlay(play: Play, action: PlayAction): Play {
  switch (action.type) {
    case "tab":
      return play.tab === action.tab ? play : { ...play, tab: action.tab };
    case "list":
      return play.view === "list" ? play : { ...play, view: "list" };
    case "carry-on":
      return current(play) && play.view !== "draw" ? { ...play, view: "draw" } : play;
    case "open": {
      const pattern = patternOf(action.ref);
      if (!pattern) return play;
      const key = refKey(action.ref);
      const found = play.drawings.find((game) => refKey(game.ref) === key);
      const others = play.drawings.filter((game) => game !== found);
      const resume = found && phaseOf(found, pattern) !== "done" ? found : null;
      const game = resume ?? newGame(action.ref, play.nextId);
      return {
        ...play,
        view: "draw",
        tab: action.ref.kind === "endless" ? "endless" : play.tab,
        drawings: [...others, game].slice(-KEEP),
        nextId: resume ? play.nextId : play.nextId + 1,
      };
    }
    case "again": {
      const game = current(play);
      if (!game) return play;
      return { ...play, drawings: [...play.drawings.slice(0, -1), newGame(game.ref, play.nextId)], nextId: play.nextId + 1 };
    }
    case "game": {
      const game = current(play);
      const pattern = game && patternOf(game.ref);
      if (!game || !pattern) return play;
      const next = reduce(game, action.action, pattern);
      return next === game ? play : { ...play, drawings: [...play.drawings.slice(0, -1), next] };
    }
  }
}

/** Reads a saved play state defensively: drawings that don't fit their pattern are dropped. */
export function parsePlay(raw: string | null): Play | null {
  if (!raw) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!data || typeof data !== "object") return null;
  const { view, tab, drawings, nextId } = data as Record<string, unknown>;
  const games = (Array.isArray(drawings) ? drawings : []).map(parseGame).filter((g): g is Game => g !== null);
  // One drawing per pattern: the latest wins.
  const unique = games.filter((game, i) => !games.slice(i + 1).some((later) => refKey(later.ref) === refKey(game.ref)));
  const topId = Math.max(0, ...unique.map((game) => game.id));
  return {
    view: view === "draw" && unique.length > 0 ? "draw" : "list",
    tab: TABS.includes(tab as Tab) ? (tab as Tab) : NO_PLAY.tab,
    drawings: unique.slice(-KEEP),
    nextId: typeof nextId === "number" && Number.isInteger(nextId) && nextId > topId ? nextId : topId + 1,
  };
}

/** Rangoli's one option, in Settings. */
export type Options = { sound: boolean };

export const DEFAULT_OPTIONS: Options = { sound: true };

export function parseOptions(raw: string | null): Options | null {
  try {
    const data = JSON.parse(raw ?? "null") as unknown;
    if (!data || typeof data !== "object") return null;
    const { sound } = data as Record<string, unknown>;
    return { sound: typeof sound === "boolean" ? sound : DEFAULT_OPTIONS.sound };
  } catch {
    return null;
  }
}

export function changeOptions(options: Options, patch: Partial<Options>): Options {
  return patch.sound === undefined || patch.sound === options.sound ? options : { ...options, ...patch };
}
