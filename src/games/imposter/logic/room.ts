import { pickFair, settle, type Ledger } from "./fair";
import { randomId, randomItem, type Rng } from "./random";
import { category, CATEGORY_IDS, isCategoryId, type CategoryId } from "./words";

/**
 * A room is one group playing round after round on one phone: the players, their
 * scores, the fair-pick ledgers, the words already played and the round in progress.
 * Everything here is plain data so it can be saved in the browser and survive a
 * reload in the middle of a round.
 */

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 20;
export const MAX_NAME = 16;
export const TIMERS = [0, 60, 120, 180, 300] as const;
/** Quick start: how many numbered players to suggest. */
export const QUICK_PLAYERS = 5;

/** What the imposter sees on their card besides "you're the imposter". */
export type Clue = "hint" | "category" | "none";
export const CLUES: readonly Clue[] = ["hint", "category", "none"];

export type Player = { id: string; name: string };

export type Options = {
  /** Wanted number of imposters; a small table gets fewer (see imposterCount). */
  imposters: number;
  clue: Clue;
  /** Talking time in seconds; 0 means no timer. */
  timer: number;
  categories: CategoryId[];
  sound: boolean;
};

/**
 * deal   → the phone goes round, everyone opens their own card once
 * talk   → one word each, starting with `starter`
 * vote   → the table points at a suspect
 * guess  → every imposter was caught: one last guess at the word
 * result → who won, points, next round
 */
export type Stage = "deal" | "talk" | "vote" | "guess" | "result";

/** Running when `endsAt` is set; paused with `left` ms to go otherwise. */
export type Timer = { endsAt: number | null; left: number };

export type Round = {
  number: number;
  stage: Stage;
  word: string;
  hint: string;
  category: CategoryId;
  /** Who's playing this round, in seating order. */
  seats: string[];
  imposters: string[];
  starter: string;
  /** Deal: whose card is next, and whether it's on screen (vs. passing the phone). */
  turn: number;
  looking: boolean;
  /** How many times each card has been opened. A card is sealed until its first open. */
  opens: Record<string, number>;
  /** While talking: who opened their card again, in order. Everyone can see this. */
  rechecks: string[];
  timer: Timer | null;
  accused: string[];
  guessed: boolean | null;
  points: Record<string, number>;
};

export type Room = {
  version: 1;
  players: Player[];
  options: Options;
  /** Fair-pick ledgers: imposter turns, and who talks first. */
  ledger: Ledger;
  starts: Ledger;
  scores: Record<string, number>;
  played: number;
  /** Words already dealt in this room, so nothing repeats until a category runs out. */
  used: string[];
  lastCategory: CategoryId | null;
  round: Round | null;
};

export const DEFAULT_OPTIONS: Options = {
  imposters: 1,
  clue: "hint",
  timer: 180,
  categories: [...CATEGORY_IDS],
  sound: true,
};

export function newRoom(players: Player[] = [], options: Options = DEFAULT_OPTIONS): Room {
  return {
    version: 1,
    players,
    options,
    ledger: {},
    starts: {},
    scores: {},
    played: 0,
    used: [],
    lastCategory: null,
    round: null,
  };
}

/** Imposters always stay outnumbered: 1 for 3–4 players, 2 from 5, 3 from 7. */
export function maxImposters(players: number): number {
  return Math.max(1, Math.min(3, Math.floor((players - 1) / 2)));
}

export function imposterCount(room: Room): number {
  return Math.min(Math.max(1, room.options.imposters), maxImposters(room.players.length));
}

export function cleanName(name: string): string {
  return name.replace(/\s+/g, " ").trim().slice(0, MAX_NAME);
}

/** Why a name can't be used, or null when it's fine. */
export function nameProblem(players: readonly Player[], name: string, self?: string): string | null {
  const clean = cleanName(name);
  if (!clean) return "Type a name first.";
  const taken = players.find((p) => p.id !== self && p.name.toLowerCase() === clean.toLowerCase());
  if (taken) return `${taken.name} is already playing.`;
  if (!self && players.length >= MAX_PLAYERS) return `That's the most players (${MAX_PLAYERS}).`;
  return null;
}

/** Why a round can't start yet, or null. */
export function startProblem(room: Room): string | null {
  const missing = MIN_PLAYERS - room.players.length;
  if (missing > 0) return `Add ${missing} more ${missing === 1 ? "player" : "players"} to start.`;
  if (room.options.categories.length === 0) return "Pick at least one category.";
  return null;
}

/**
 * Next word: a category other than last round's (when there's a choice), then a
 * word from it nobody has played yet in this room. A category that has run out
 * starts over.
 */
export function drawWord(
  categories: readonly CategoryId[],
  used: readonly string[],
  last: CategoryId | null,
  rng: Rng,
): { category: CategoryId; word: string; hint: string; used: string[] } {
  const choices = categories.length > 1 ? categories.filter((id) => id !== last) : categories;
  const picked = randomItem(choices, rng);
  const words = category(picked).words;
  const seen = new Set(used);
  let fresh = words.filter(([word]) => !seen.has(word));
  let kept = [...used];
  if (fresh.length === 0) {
    const inCategory = new Set(words.map(([word]) => word));
    kept = kept.filter((word) => !inCategory.has(word));
    fresh = [...words];
  }
  const [word, hint] = randomItem(fresh, rng);
  return { category: picked, word, hint, used: [...kept, word] };
}

/** Deals a new round (or re-deals the current one): word, imposters, who starts. */
function deal(room: Room, rng: Rng): Room {
  const seats = room.players.map((p) => p.id);
  const drawn = drawWord(room.options.categories, room.used, room.lastCategory, rng);
  const round: Round = {
    number: room.played + 1,
    stage: "deal",
    word: drawn.word,
    hint: drawn.hint,
    category: drawn.category,
    seats,
    imposters: pickFair(seats, room.ledger, imposterCount(room), rng),
    // Drawn on its own, so who starts says nothing about who the imposter is.
    starter: pickFair(seats, room.starts, 1, rng)[0],
    turn: 0,
    looking: false,
    opens: Object.fromEntries(seats.map((id) => [id, 0])),
    rechecks: [],
    timer: null,
    accused: [],
    guessed: null,
    points: {},
  };
  return { ...room, used: drawn.used, lastCategory: drawn.category, round };
}

export type Winner = "crew" | "imposters";

/** Who won a finished vote: imposters escape, steal it with the word, or get caught. */
export function verdict(round: Round): { winner: Winner; how: "escaped" | "guessed" | "caught" } {
  const allCaught = round.imposters.every((id) => round.accused.includes(id));
  if (!allCaught) return { winner: "imposters", how: "escaped" };
  if (round.guessed) return { winner: "imposters", how: "guessed" };
  return { winner: "crew", how: "caught" };
}

/** Points: an imposter who gets away +2, steals it with the word +1; a crew catch +1 each. */
function finish(room: Room, round: Round): Room {
  const { winner, how } = verdict(round);
  const points: Record<string, number> = {};
  if (winner === "imposters") {
    for (const id of round.imposters) points[id] = how === "escaped" ? 2 : 1;
  } else {
    for (const id of round.seats) if (!round.imposters.includes(id)) points[id] = 1;
  }
  const scores = { ...room.scores };
  for (const [id, gained] of Object.entries(points)) scores[id] = (scores[id] ?? 0) + gained;
  return { ...room, scores, played: room.played + 1, round: { ...round, stage: "result", points } };
}

function without<T>(record: Record<string, T>, id: string): Record<string, T> {
  return Object.fromEntries(Object.entries(record).filter(([key]) => key !== id));
}

export type TimerOp = "pause" | "resume" | "add";

export function timeLeft(timer: Timer, now: number): number {
  return Math.max(0, timer.endsAt === null ? timer.left : timer.endsAt - now);
}

function changeTimer(timer: Timer, op: TimerOp, now: number): Timer {
  const left = timeLeft(timer, now);
  if (op === "pause") return { endsAt: null, left };
  if (op === "resume") return left > 0 ? { endsAt: now + left, left } : timer;
  // +30 seconds. A running timer that already hit zero starts again.
  const more = left + 30_000;
  return { endsAt: timer.endsAt === null ? null : now + more, left: more };
}

export type Action =
  | { type: "add-player"; id: string; name: string }
  | { type: "quick-players"; count: number; rng: Rng }
  | { type: "rename-player"; id: string; name: string }
  | { type: "remove-player"; id: string }
  | { type: "options"; patch: Partial<Options> }
  | { type: "start"; rng: Rng }
  | { type: "look" }
  | { type: "back" }
  | { type: "open"; id: string }
  | { type: "done"; now: number }
  | { type: "redeal"; rng: Rng }
  | { type: "timer"; op: TimerOp; now: number }
  | { type: "vote" }
  | { type: "talk" }
  | { type: "accuse"; ids: string[] }
  | { type: "guess"; correct: boolean }
  | { type: "lobby" }
  | { type: "new-room" };

/** The whole game as one function: room + action → next room. Bad actions change nothing. */
export function reduce(room: Room, action: Action): Room {
  const round = room.round;
  switch (action.type) {
    case "add-player": {
      if (round || nameProblem(room.players, action.name)) return room;
      return { ...room, players: [...room.players, { id: action.id, name: cleanName(action.name) }] };
    }
    case "quick-players": {
      // No time for names: Player 1, Player 2, … Anyone can be renamed later.
      if (round || room.players.length > 0) return room;
      const count = Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, Math.round(action.count)));
      const players = Array.from({ length: count }, (_, i) => ({ id: randomId(action.rng), name: `Player ${i + 1}` }));
      return { ...room, players };
    }
    case "rename-player": {
      if (nameProblem(room.players, action.name, action.id)) return room;
      const name = cleanName(action.name);
      return { ...room, players: room.players.map((p) => (p.id === action.id ? { ...p, name } : p)) };
    }
    case "remove-player": {
      if (round) return room;
      return {
        ...room,
        players: room.players.filter((p) => p.id !== action.id),
        scores: without(room.scores, action.id),
        ledger: without(room.ledger, action.id),
        starts: without(room.starts, action.id),
      };
    }
    case "options":
      return { ...room, options: { ...room.options, ...action.patch } };
    case "start":
      return round || startProblem(room) ? room : deal(room, action.rng);
    case "new-room":
      return newRoom(room.players, room.options);
    case "lobby":
      return round ? { ...room, round: null } : room;
  }

  if (!round) return room;
  const current = round.seats[round.turn];
  const set = (patch: Partial<Round>): Room => ({ ...room, round: { ...round, ...patch } });

  switch (action.type) {
    case "look":
      return round.stage === "deal" && !round.looking ? set({ looking: true }) : room;
    case "back":
      // Only before opening: once a card is open, the next screen is the next player.
      return round.stage === "deal" && round.looking && round.opens[current] === 0 ? set({ looking: false }) : room;
    case "open": {
      const opens = { ...round.opens, [action.id]: (round.opens[action.id] ?? 0) + 1 };
      if (round.stage === "deal" && round.looking && action.id === current) return set({ opens });
      if (round.stage === "talk" && round.seats.includes(action.id)) {
        return set({ opens, rechecks: [...round.rechecks, action.id] });
      }
      return room;
    }
    case "done": {
      if (round.stage !== "deal" || !round.looking || round.opens[current] === 0) return room;
      if (round.turn + 1 < round.seats.length) return set({ turn: round.turn + 1, looking: false });
      // Everyone has their card: the round counts from here.
      const time = room.options.timer * 1000;
      return {
        ...room,
        ledger: settle(round.seats, room.ledger, round.imposters),
        starts: settle(round.seats, room.starts, [round.starter]),
        round: {
          ...round,
          stage: "talk",
          looking: false,
          timer: time > 0 ? { endsAt: action.now + time, left: time } : null,
        },
      };
    }
    case "redeal":
      // Someone saw a card that wasn't theirs: new word and new imposters for everyone.
      // The burned word stays used; the fair-pick ledgers don't change.
      return round.stage === "deal" ? deal({ ...room, round: null }, action.rng) : room;
    case "timer":
      return round.stage === "talk" && round.timer ? set({ timer: changeTimer(round.timer, action.op, action.now) }) : room;
    case "vote":
      return round.stage === "talk" ? set({ stage: "vote" }) : room;
    case "talk":
      return round.stage === "vote" ? set({ stage: "talk" }) : room;
    case "accuse": {
      const ids = [...new Set(action.ids)];
      if (round.stage !== "vote" || ids.length !== round.imposters.length) return room;
      if (!ids.every((id) => round.seats.includes(id))) return room;
      const next = { ...round, accused: ids };
      return round.imposters.every((id) => ids.includes(id))
        ? { ...room, round: { ...next, stage: "guess" } }
        : finish(room, next);
    }
    case "guess":
      return round.stage === "guess" ? finish(room, { ...round, guessed: action.correct }) : room;
  }
  return room;
}

/* ---------- Loading a saved room ---------- */

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const isString = (v: unknown): v is string => typeof v === "string";
const isNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isStrings = (v: unknown): v is string[] => Array.isArray(v) && v.every(isString);
const isNumbers = (v: unknown): v is Record<string, number> => isObject(v) && Object.values(v).every(isNumber);
const isLedger = (v: unknown): v is Ledger =>
  isObject(v) && Object.values(v).every((t) => isObject(t) && isNumber(t.owed) && isNumber(t.taken));
const STAGES: readonly Stage[] = ["deal", "talk", "vote", "guess", "result"];

function parseOptions(v: unknown): Options {
  if (!isObject(v)) return DEFAULT_OPTIONS;
  const categories = Array.isArray(v.categories) ? v.categories.filter(isCategoryId) : DEFAULT_OPTIONS.categories;
  return {
    imposters: isNumber(v.imposters) ? Math.min(3, Math.max(1, Math.round(v.imposters))) : DEFAULT_OPTIONS.imposters,
    clue: CLUES.includes(v.clue as Clue) ? (v.clue as Clue) : DEFAULT_OPTIONS.clue,
    timer: (TIMERS as readonly unknown[]).includes(v.timer) ? (v.timer as number) : DEFAULT_OPTIONS.timer,
    categories,
    sound: typeof v.sound === "boolean" ? v.sound : DEFAULT_OPTIONS.sound,
  };
}

function parseRound(v: unknown, players: readonly Player[]): Round | null {
  if (!isObject(v) || !STAGES.includes(v.stage as Stage) || !isCategoryId(v.category)) return null;
  if (!isString(v.word) || !isString(v.hint) || !isString(v.starter) || !isNumber(v.number)) return null;
  if (!isStrings(v.seats) || !isStrings(v.imposters) || !isStrings(v.rechecks) || !isStrings(v.accused)) return null;
  if (!isNumber(v.turn) || typeof v.looking !== "boolean" || !isNumbers(v.opens) || !isNumbers(v.points)) return null;
  // A player removed mid-round can't happen in the app; drop the round if it did.
  if (!v.seats.every((id) => players.some((p) => p.id === id))) return null;
  if (v.turn < 0 || v.turn >= v.seats.length) return null;
  const timer = isObject(v.timer) && isNumber(v.timer.left) ? (v.timer as Timer) : null;
  const guessed = typeof v.guessed === "boolean" ? v.guessed : null;
  return { ...(v as unknown as Round), timer, guessed };
}

/** A saved room, or null if there's nothing usable (then the game starts fresh). */
export function parseRoom(raw: string | null): Room | null {
  let v: unknown;
  try {
    v = JSON.parse(raw ?? "null");
  } catch {
    return null;
  }
  if (!isObject(v) || v.version !== 1 || !Array.isArray(v.players)) return null;
  const players = v.players.filter(
    (p): p is Player => isObject(p) && isString(p.id) && isString(p.name) && p.name.length > 0,
  );
  return {
    version: 1,
    players,
    options: parseOptions(v.options),
    ledger: isLedger(v.ledger) ? v.ledger : {},
    starts: isLedger(v.starts) ? v.starts : {},
    scores: isNumbers(v.scores) ? v.scores : {},
    played: isNumber(v.played) ? v.played : 0,
    used: isStrings(v.used) ? v.used : [],
    lastCategory: isCategoryId(v.lastCategory) ? v.lastCategory : null,
    round: parseRound(v.round, players),
  };
}
