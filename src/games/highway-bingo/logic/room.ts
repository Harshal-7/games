import type { Rng } from "@/party/logic/random";

import { freeCell, MAX_SEAT, MIN_SEAT, progress, type Progress } from "./card";
import { newCode, readCode, SIZES, type Size } from "./code";

/**
 * Everything Highway Bingo keeps on this phone: the options, the game on screen and the
 * marks of every card played lately, per code and seat, so a reload (or joining the same
 * code and seat again) brings them back. Plain data, saved in the browser.
 */

/**
 * own      → everyone on their own phone, with the shared code; this phone plays one seat
 * sides    → one phone, two cards: left windows against right windows (seats 1 and 2)
 * together → one phone, one card for the whole car (seat 1)
 */
export type Mode = "own" | "sides" | "together";

/** Playing for a line, or playing on to a full card after one. */
export type Goal = "line" | "full";

export type Options = {
  /** The card size for games this phone starts. Joining takes the size from the code. */
  size: Size;
  /** A stamp when you mark a square, a fanfare and a buzz for a bingo. */
  sound: boolean;
  /** Keep the screen on while a card is open. */
  awake: boolean;
};

export const DEFAULT_OPTIONS: Options = { size: 5, sound: true, awake: true };

export type Game = {
  /** As shown: "CHAI-42". */
  code: string;
  mode: Mode;
  /** The seats this phone plays: one, or two for left against right. */
  seats: number[];
  goal: Goal;
  /** Own phones: the code is on screen for the car to copy. */
  sharing: boolean;
  /** Left against right: which card a narrow screen shows (0 left, 1 right). */
  side: number;
};

/** One card's marks, by cell number. The free middle is never in the list. */
export type Saved = { code: string; seat: number; marks: number[] };

export type Room = {
  version: 1;
  options: Options;
  game: Game | null;
  /** Cards played lately, newest first. */
  cards: Saved[];
};

/** How many cards' marks to keep. Older ones drop off. */
export const MAX_SAVED = 30;

export function newRoom(): Room {
  return { version: 1, options: DEFAULT_OPTIONS, game: null, cards: [] };
}

export type Action =
  | { type: "start"; mode: Mode; rng: Rng }
  | { type: "join"; code: string; seat: number }
  | { type: "mark"; seat: number; cell: number }
  | { type: "play-on" }
  | { type: "share"; on: boolean }
  | { type: "side"; side: number }
  | { type: "end" }
  | { type: "options"; patch: Partial<Options> };

const SEATS: Record<Exclude<Mode, "own">, number[]> = { sides: [1, 2], together: [1] };

export function reduce(room: Room, action: Action): Room {
  switch (action.type) {
    case "start": {
      const code = newCode("highway", room.options.size, action.rng);
      const seats = action.mode === "own" ? [MIN_SEAT] : SEATS[action.mode];
      return open(room, { code, mode: action.mode, seats, goal: "line", sharing: action.mode === "own", side: 0 });
    }
    case "join": {
      const read = readCode(action.code);
      if (!read.ok || !isSeat(action.seat)) return room;
      return open(room, { code: read.code.text, mode: "own", seats: [action.seat], goal: "line", sharing: false, side: 0 });
    }
    case "mark": {
      const game = room.game;
      const read = game && readCode(game.code);
      if (!game || !read?.ok || !game.seats.includes(action.seat)) return room;
      const { size } = read.code;
      const cell = action.cell;
      if (!Number.isInteger(cell) || cell < 0 || cell >= size * size || cell === freeCell(size)) return room;
      const marks = marksOf(room, game.code, action.seat);
      const next = marks.includes(cell) ? marks.filter((m) => m !== cell) : [...marks, cell].sort((a, b) => a - b);
      return { ...room, cards: remember(room.cards, { code: game.code, seat: action.seat, marks: next }) };
    }
    case "play-on":
      return room.game && room.game.goal !== "full" ? { ...room, game: { ...room.game, goal: "full" } } : room;
    case "share":
      return room.game && room.game.sharing !== action.on ? { ...room, game: { ...room.game, sharing: action.on } } : room;
    case "side":
      return room.game && room.game.side !== action.side && (action.side === 0 || action.side === 1)
        ? { ...room, game: { ...room.game, side: action.side } }
        : room;
    case "end":
      return room.game ? { ...room, game: null } : room;
    case "options":
      return { ...room, options: { ...room.options, ...action.patch } };
  }
}

/** Puts a game on screen, bringing its cards' marks to the front of the saved list. */
function open(room: Room, game: Game): Room {
  let cards = room.cards;
  for (const seat of [...game.seats].reverse()) {
    cards = remember(cards, { code: game.code, seat, marks: marksOf(room, game.code, seat) });
  }
  return { ...room, game, cards };
}

function remember(cards: Saved[], card: Saved): Saved[] {
  const rest = cards.filter((c) => c.code !== card.code || c.seat !== card.seat);
  return [card, ...rest].slice(0, MAX_SAVED);
}

export function marksOf(room: Room, code: string, seat: number): number[] {
  return room.cards.find((c) => c.code === code && c.seat === seat)?.marks ?? [];
}

export function isSeat(seat: unknown): seat is number {
  return Number.isInteger(seat) && (seat as number) >= MIN_SEAT && (seat as number) <= MAX_SEAT;
}

/** How each seat on this phone is doing, and whether it has won (a line, or a full card after Play on). */
export function standings(room: Room): { seat: number; progress: Progress; won: boolean }[] {
  const game = room.game;
  const read = game && readCode(game.code);
  if (!game || !read?.ok) return [];
  return game.seats.map((seat) => {
    const p = progress(read.code.size, marksOf(room, game.code, seat));
    return { seat, progress: p, won: game.goal === "line" ? p.done.length > 0 : p.full };
  });
}

/** True once any square of the game on screen is marked: leaving then asks first. */
export function underway(room: Room): boolean {
  const game = room.game;
  return game !== null && game.seats.some((seat) => marksOf(room, game.code, seat).length > 0);
}

/** What a seat is called on screen. */
export function seatName(game: Pick<Game, "mode">, seat: number): string {
  if (game.mode === "sides") return seat === 1 ? "Left windows" : "Right windows";
  if (game.mode === "together") return "The whole car";
  return `Seat ${seat}`;
}

// ---------- Reading a save ----------

/** Reads a saved room defensively: anything it can't use falls back to a default, so older saves still load. */
export function parseRoom(raw: string | null): Room | null {
  if (!raw) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isObject(data) || data.version !== 1) return null;
  const cards = Array.isArray(data.cards) ? data.cards.flatMap(parseSaved).slice(0, MAX_SAVED) : [];
  return { version: 1, options: parseOptions(data.options), game: parseGame(data.game), cards };
}

function parseOptions(data: unknown): Options {
  const o = isObject(data) ? data : {};
  return {
    size: SIZES.includes(o.size as Size) ? (o.size as Size) : DEFAULT_OPTIONS.size,
    sound: typeof o.sound === "boolean" ? o.sound : DEFAULT_OPTIONS.sound,
    awake: typeof o.awake === "boolean" ? o.awake : DEFAULT_OPTIONS.awake,
  };
}

const MODES: readonly Mode[] = ["own", "sides", "together"];

function parseGame(data: unknown): Game | null {
  if (!isObject(data) || typeof data.code !== "string") return null;
  const read = readCode(data.code);
  const mode = MODES.find((m) => m === data.mode);
  if (!read.ok || !mode) return null;
  const first: unknown = Array.isArray(data.seats) ? data.seats[0] : undefined;
  const seats = mode === "own" ? (isSeat(first) ? [first] : null) : SEATS[mode];
  if (!seats) return null;
  return {
    code: read.code.text,
    mode,
    seats,
    goal: data.goal === "full" ? "full" : "line",
    sharing: mode === "own" && data.sharing === true,
    side: data.side === 1 ? 1 : 0,
  };
}

function parseSaved(data: unknown): Saved[] {
  if (!isObject(data) || typeof data.code !== "string" || !isSeat(data.seat) || !Array.isArray(data.marks)) return [];
  const read = readCode(data.code);
  if (!read.ok) return [];
  const { size } = read.code;
  const free = freeCell(size);
  const marks = [...new Set(data.marks)]
    .filter((m): m is number => Number.isInteger(m) && m >= 0 && m < size * size && m !== free)
    .sort((a, b) => a - b);
  return [{ code: read.code.text, seat: data.seat, marks }];
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
