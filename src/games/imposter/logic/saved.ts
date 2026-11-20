import type { Room } from "./room";

/** Where the room is saved in this browser. */
export const ROOM_KEY = "games:imposter:room:v1";

/**
 * What Home shows about a saved room. Counts only: never the word, the hint, the
 * category or who the imposters are, since Home is a public screen.
 */
export type SavedGame = {
  players: number;
  /** The round being played, or the last one finished between rounds (0 before the first). */
  round: number;
  /** A round is under way (dealing, talking, voting or its result). */
  inRound: boolean;
};

export function savedGame(room: Room): SavedGame | null {
  if (room.players.length === 0) return null;
  return {
    players: room.players.length,
    round: room.round ? room.round.number : room.played,
    inRound: room.round !== null,
  };
}

/** "Round 3 · 5 players", "After round 3 · 5 players", "5 players · not started". */
export function savedGameLine({ players, round, inRound }: SavedGame): string {
  const who = `${players} ${players === 1 ? "player" : "players"}`;
  if (inRound) return `Round ${round} · ${who}`;
  if (round > 0) return `After round ${round} · ${who}`;
  return `${who} · not started`;
}

/**
 * Runs in <head> before the first paint: marks <html data-room> when a saved room has
 * players, so Home keeps the space for its Continue card instead of jumping once the
 * room loads. Reads only the player count.
 */
export const SAVED_ROOM_SCRIPT = `(function(){try{var r=JSON.parse(localStorage.getItem(${JSON.stringify(
  ROOM_KEY,
)}));if(r&&r.players&&r.players.length)document.documentElement.setAttribute("data-room","")}catch(e){}})()`;
