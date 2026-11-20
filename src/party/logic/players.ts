import { randomId, type Rng } from "./random";

/**
 * The player list of a game played around one phone: everyone at the table, in seating
 * order. Plain data that each game keeps in its own saved state; `updatePlayers` makes
 * the changes and `Roster` (ui/roster.tsx) shows them.
 */

export type Player = { id: string; name: string };

export const MAX_NAME = 16;
/** Quick start: how many numbered players to suggest. */
export const QUICK_PLAYERS = 5;

/** How many people a game takes. Most party games here take 3 to 20; others pass their own. */
export type Limits = { min: number; max: number };
export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 20;
export const DEFAULT_LIMITS: Limits = { min: MIN_PLAYERS, max: MAX_PLAYERS };

export function cleanName(name: string): string {
  return name.replace(/\s+/g, " ").trim().slice(0, MAX_NAME);
}

/**
 * Why a name can't be used, or null when it's fine. A rename passes `self`, the player
 * being renamed; a new name also needs a seat (`max`).
 */
export function nameProblem(
  players: readonly Player[],
  name: string,
  { self, max = MAX_PLAYERS }: { self?: string; max?: number } = {},
): string | null {
  const clean = cleanName(name);
  if (!clean) return "Type a name first.";
  const taken = players.find((p) => p.id !== self && p.name.toLowerCase() === clean.toLowerCase());
  if (taken) return `${taken.name} is already playing.`;
  if (!self && players.length >= max) return `That's the most players (${max}).`;
  return null;
}

/** "Add 2 more players to start.", or null once there are enough. */
export function tooFew(players: readonly Player[], min = MIN_PLAYERS): string | null {
  const missing = min - players.length;
  return missing > 0 ? `Add ${missing} more ${missing === 1 ? "player" : "players"} to start.` : null;
}

export type PlayerAction =
  | { type: "add-player"; id: string; name: string }
  | { type: "quick-players"; count: number; rng: Rng }
  | { type: "rename-player"; id: string; name: string }
  | { type: "remove-player"; id: string };

/**
 * The list after one change. A name that can't be used, or Quick start on a table that
 * already has players, gives back the same list, so the game can tell nothing changed.
 * When the list may change at all (say, not mid-round) is up to the game.
 */
export function updatePlayers(players: Player[], action: PlayerAction, limits = DEFAULT_LIMITS): Player[] {
  switch (action.type) {
    case "add-player":
      if (nameProblem(players, action.name, { max: limits.max })) return players;
      return [...players, { id: action.id, name: cleanName(action.name) }];
    case "quick-players": {
      // No time for names: Player 1, Player 2, … Anyone can be renamed later.
      if (players.length > 0) return players;
      const count = Math.min(limits.max, Math.max(limits.min, Math.round(action.count)));
      return Array.from({ length: count }, (_, i) => ({ id: randomId(action.rng), name: `Player ${i + 1}` }));
    }
    case "rename-player": {
      if (nameProblem(players, action.name, { self: action.id })) return players;
      const name = cleanName(action.name);
      return players.map((p) => (p.id === action.id ? { ...p, name } : p));
    }
    case "remove-player":
      return players.filter((p) => p.id !== action.id);
  }
}
