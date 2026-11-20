import type { Rng } from "@/party/logic/random";

import { makeOrder, makeTeams, pickOne, type Mode } from "./pick";

/**
 * The fingers on the screen, as plain data. Every finger is a pointer (its pointerId)
 * with a spot and a colour. Once nobody has joined or left for SETTLE_MS, a COUNT_MS
 * countdown runs, and a finger joining or leaving starts it all over. Time comes in with
 * each event (`now`, from Date.now()), so a slow or paused page can't stretch it.
 *
 * After the pick the result stays until every finger has lifted. Fingers that join then
 * are only counted so the table knows when it's empty again.
 */

/** How long nobody may move before the countdown starts. */
export const SETTLE_MS = 1500;
/** The countdown itself. */
export const COUNT_MS = 3000;
/** Fewest fingers that get a pick. */
export const MIN_FINGERS = 2;
/** Finger colours (the site's game colours, then cream and soft tints); then they repeat. */
export const FINGER_COLORS = 10;

export type Finger = { id: number; x: number; y: number; color: number };

export type Result =
  | { mode: "one"; picked: number }
  /** Teams in order (A, B…), each a list of finger ids. */
  | { mode: "teams"; teams: number[][] }
  /** Finger ids, first to last. */
  | { mode: "order"; order: number[] };

export type Table = {
  fingers: Finger[];
  /** When a finger last joined or left: the countdown runs off this. */
  changedAt: number | null;
  result: Result | null;
  /** After a pick: fingers that joined late, still down. */
  late: number[];
};

export const EMPTY: Table = { fingers: [], changedAt: null, result: null, late: [] };

export type Event =
  | { type: "down"; id: number; x: number; y: number; now: number }
  | { type: "move"; id: number; x: number; y: number }
  /** A finger lifted, or the phone took it away (pointercancel). */
  | { type: "up"; id: number; now: number }
  | { type: "tick"; now: number; mode: Mode; teams: number; rng: Rng }
  | { type: "reset" };

/** The lowest colour no finger is using, so colours stay put as fingers come and go. */
function freeColor(fingers: readonly Finger[]): number {
  const used = new Set(fingers.map((f) => f.color));
  for (let c = 0; c < FINGER_COLORS; c++) if (!used.has(c)) return c;
  return fingers.length % FINGER_COLORS;
}

function decide(ids: number[], mode: Mode, teams: number, rng: Rng): Result {
  if (mode === "teams") return { mode, teams: makeTeams(ids, teams, rng) };
  if (mode === "order") return { mode, order: makeOrder(ids, rng) };
  return { mode: "one", picked: pickOne(ids, rng) };
}

export function reduce(table: Table, event: Event): Table {
  switch (event.type) {
    case "reset":
      return table === EMPTY ? table : EMPTY;
    case "down": {
      if (table.fingers.some((f) => f.id === event.id) || table.late.includes(event.id)) return table;
      if (table.result) return { ...table, late: [...table.late, event.id] };
      const finger = { id: event.id, x: event.x, y: event.y, color: freeColor(table.fingers) };
      return { ...table, fingers: [...table.fingers, finger], changedAt: event.now };
    }
    case "move": {
      const at = table.fingers.findIndex((f) => f.id === event.id);
      if (at < 0) return table;
      const fingers = [...table.fingers];
      fingers[at] = { ...fingers[at], x: event.x, y: event.y };
      return { ...table, fingers };
    }
    case "up": {
      const fingers = table.fingers.filter((f) => f.id !== event.id);
      const late = table.late.filter((id) => id !== event.id);
      if (fingers.length === table.fingers.length && late.length === table.late.length) return table;
      if (table.result) return fingers.length + late.length === 0 ? EMPTY : { ...table, fingers, late };
      return { ...table, fingers, changedAt: fingers.length > 0 ? event.now : null };
    }
    case "tick": {
      if (table.result || table.changedAt === null || table.fingers.length < MIN_FINGERS) return table;
      if (event.now < table.changedAt + SETTLE_MS + COUNT_MS) return table;
      const ids = table.fingers.map((f) => f.id);
      return { ...table, result: decide(ids, event.mode, event.teams, event.rng) };
    }
  }
}

export type Phase =
  | { kind: "waiting" }
  | { kind: "settling" }
  /** `left`: whole seconds still to go (3, 2, 1); `done`: how much of the count has gone, 0 to 1. */
  | { kind: "counting"; left: number; done: number }
  | { kind: "picked"; result: Result };

/** Where the table is at `now`. */
export function phase(table: Table, now: number): Phase {
  if (table.result) return { kind: "picked", result: table.result };
  if (table.changedAt === null || table.fingers.length < MIN_FINGERS) return { kind: "waiting" };
  const into = now - table.changedAt - SETTLE_MS;
  if (into < 0) return { kind: "settling" };
  const gone = Math.min(COUNT_MS, into);
  return { kind: "counting", left: Math.max(1, Math.ceil((COUNT_MS - gone) / 1000)), done: gone / COUNT_MS };
}

/** Which team a finger is on (0 for A), or null. */
export function teamOf(result: Result, id: number): number | null {
  if (result.mode !== "teams") return null;
  const team = result.teams.findIndex((members) => members.includes(id));
  return team < 0 ? null : team;
}

/** A finger's place in the order (1 for first), or null. */
export function placeOf(result: Result, id: number): number | null {
  if (result.mode !== "order") return null;
  const at = result.order.indexOf(id);
  return at < 0 ? null : at + 1;
}
