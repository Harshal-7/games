import { pickFair, settle, type Ledger } from "@/party/logic/fair";
import { tooFew, updatePlayers, type Player, type PlayerAction } from "@/party/logic/players";
import type { Rng } from "@/party/logic/random";
import { changeTimer, timeLeft } from "@/party/logic/timer";

import { isFuseLength, lightFuse, type Fuse, type FuseLength } from "./fuse";
import { drawPrompt, PACK_IDS, type PackId } from "./prompts";

/**
 * A room is one group playing game after game on one phone: the players in passing
 * order, the options, everyone's wins so far and the game under way. Plain data, saved
 * in the browser, so a reload mid-round comes back to the same screen (paused).
 */

export const LIVES_CHOICES = [1, 2, 3] as const;

export type Options = {
  /** Lives each at the start of a game. */
  lives: number;
  fuse: FuseLength;
  packs: PackId[];
  /** Answers in English only. Off: any language counts (Hindi, Marathi and so on). */
  english: boolean;
  /** The ticks, the bang and the buzz. */
  sound: boolean;
};

export const DEFAULT_OPTIONS: Options = {
  lives: 2,
  fuse: "normal",
  packs: [...PACK_IDS],
  english: false,
  sound: true,
};

/** A tap on Pass this soon after the last pass (or lighting it) is ignored, so a double tap can't skip anyone. */
export const PASS_GUARD_MS = 300;
/** Light it waits this long after a bang, so a last frantic tap on Pass can't light the next fuse. */
export const LIGHT_GUARD_MS = 1_000;
/** A fuse found burning when a saved game loads comes back paused, with at least this long to go. */
export const RELOAD_LEFT_MS = 1_500;

/**
 * ready   → a new game: the first player lights the fuse
 * burning → the fuse is lit (or paused): say an answer, pass
 * bang    → the holder lost a life. The next round lights from here, unless someone has won.
 */
export type Stage = "ready" | "burning" | "bang";

export type Game = {
  /** Who's playing this game, in passing order. */
  seats: string[];
  lives: Record<string, number>;
  /** Rounds lit so far. */
  round: number;
  stage: Stage;
  /** Who has the phone: the first player before round 1, then whoever holds it; after a bang, the loser. */
  holder: string;
  prompt: string | null;
  fuse: Fuse | null;
  /** Passes this round, and when the last one (or the lighting) was. */
  passes: number;
  passedAt: number | null;
  /** When the last bang went off. */
  bangAt: number | null;
};

export type Room = {
  version: 1;
  players: Player[];
  options: Options;
  /** Games won, carried over from game to game. */
  wins: Record<string, number>;
  /** Games played to a winner. */
  played: number;
  /** Fair-pick ledger for who holds the phone first each game. */
  starts: Ledger;
  /** Prompts already played in this room, so none comes back until the packs run out. */
  used: string[];
  game: Game | null;
};

export function newRoom(players: Player[] = [], options: Options = DEFAULT_OPTIONS): Room {
  return { version: 1, players, options, wins: {}, played: 0, starts: {}, used: [], game: null };
}

/** Why a game can't start yet, or null. */
export function startProblem(room: Room): string | null {
  const few = tooFew(room.players);
  if (few) return few;
  if (room.options.packs.length === 0) return "Pick at least one prompt pack.";
  return null;
}

/** Everyone with a life left, in passing order. */
export function alive(game: Game): string[] {
  return game.seats.filter((id) => (game.lives[id] ?? 0) > 0);
}

/** The last one standing, once everyone else is out. */
export function winner(game: Game): string | null {
  const left = alive(game);
  return left.length === 1 ? left[0] : null;
}

/** Who gets the phone after `id`: the next seat round the table that still has a life. */
export function nextPlayer(game: Game, id: string): string {
  const count = game.seats.length;
  const from = game.seats.indexOf(id);
  for (let step = 1; step <= count; step++) {
    const seat = game.seats[(from + step) % count];
    if ((game.lives[seat] ?? 0) > 0) return seat;
  }
  return id;
}

/**
 * Who lights the next fuse: a fair pick for a game's first round, then whoever lost the
 * last one, or the next player still in if that loss knocked them out.
 */
export function starter(game: Game): string {
  if (game.stage !== "bang" || (game.lives[game.holder] ?? 0) > 0) return game.holder;
  return nextPlayer(game, game.holder);
}

/** Whether `ms` (now minus an earlier time) is still inside a guard. A clock that jumped back locks nobody out. */
const within = (ms: number, guard: number) => ms >= 0 && ms < guard;

/** A new game with everyone at full lives. Who holds the phone first is a fair pick. */
function newGame(room: Room, rng: Rng): Room {
  const seats = room.players.map((p) => p.id);
  const first = pickFair(seats, room.starts, 1, rng)[0];
  return {
    ...room,
    starts: settle(seats, room.starts, [first]),
    game: {
      seats,
      lives: Object.fromEntries(seats.map((id) => [id, room.options.lives])),
      round: 0,
      stage: "ready",
      holder: first,
      prompt: null,
      fuse: null,
      passes: 0,
      passedAt: null,
      bangAt: null,
    },
  };
}

/** The fuse ran out: whoever holds the phone loses a life. The last one standing wins the game. */
function bang(room: Room, game: Game, now: number): Room {
  const loser = game.holder;
  const next: Game = {
    ...game,
    stage: "bang",
    lives: { ...game.lives, [loser]: Math.max(0, (game.lives[loser] ?? 0) - 1) },
    fuse: game.fuse && { ...game.fuse, timer: { endsAt: null, left: 0 } },
    bangAt: now,
  };
  const won = winner(next);
  if (!won) return { ...room, game: next };
  return { ...room, game: next, wins: { ...room.wins, [won]: (room.wins[won] ?? 0) + 1 }, played: room.played + 1 };
}

function without<T>(record: Record<string, T>, id: string): Record<string, T> {
  return Object.fromEntries(Object.entries(record).filter(([key]) => key !== id));
}

export type Action =
  | PlayerAction
  | { type: "options"; patch: Partial<Options> }
  | { type: "start"; rng: Rng }
  | { type: "light"; rng: Rng; now: number }
  | { type: "pass"; now: number }
  | { type: "pause"; now: number }
  | { type: "resume"; now: number }
  | { type: "bang"; now: number }
  | { type: "lobby" }
  | { type: "new-room" }
  | { type: "clear-room" };

/** The whole game as one function: room + action → next room. Actions that don't apply change nothing. */
export function reduce(room: Room, action: Action): Room {
  const game = room.game;
  switch (action.type) {
    case "add-player":
    case "quick-players":
    case "rename-player": {
      // Names can change any time; who's playing only between games.
      if (game && action.type !== "rename-player") return room;
      const players = updatePlayers(room.players, action);
      return players === room.players ? room : { ...room, players };
    }
    case "remove-player":
      if (game) return room;
      return {
        ...room,
        players: updatePlayers(room.players, action),
        wins: without(room.wins, action.id),
        starts: without(room.starts, action.id),
      };
    case "options":
      return { ...room, options: { ...room.options, ...action.patch } };
    case "start":
      // Between games only: no game yet, or the last one has a winner.
      if (startProblem(room) || (game && !(game.stage === "bang" && winner(game)))) return room;
      return newGame(room, action.rng);
    case "lobby":
      // Back to players and options. A game that hasn't been won yet counts for nobody.
      return game ? { ...room, game: null } : room;
    case "new-room":
      return newRoom(room.players, room.options);
    case "clear-room":
      return newRoom([], room.options);
  }

  if (!game) return room;
  const fuse = game.fuse;
  const burning = game.stage === "burning" && fuse !== null;
  const running = burning && fuse.timer.endsAt !== null;
  const set = (patch: Partial<Game>): Room => ({ ...room, game: { ...game, ...patch } });

  switch (action.type) {
    case "light": {
      if (game.stage === "burning" || winner(game) || room.options.packs.length === 0) return room;
      if (game.stage === "bang" && (game.bangAt === null || within(action.now - game.bangAt, LIGHT_GUARD_MS))) {
        return room;
      }
      const drawn = drawPrompt(room.options.packs, room.used, action.rng);
      return {
        ...room,
        used: drawn.used,
        game: {
          ...game,
          round: game.round + 1,
          stage: "burning",
          holder: starter(game),
          prompt: drawn.prompt,
          fuse: lightFuse(room.options.fuse, action.now, action.rng),
          passes: 0,
          passedAt: action.now,
        },
      };
    }
    case "pass":
      if (!running || timeLeft(fuse.timer, action.now) === 0) return room;
      if (game.passedAt !== null && within(action.now - game.passedAt, PASS_GUARD_MS)) return room;
      return set({ holder: nextPlayer(game, game.holder), passes: game.passes + 1, passedAt: action.now });
    case "pause":
      return running ? set({ fuse: { ...fuse, timer: changeTimer(fuse.timer, "pause", action.now) } }) : room;
    case "resume":
      if (!burning || running) return room;
      // Paused just as it ran out: it goes off now, in the same hands.
      if (fuse.timer.left <= 0) return bang(room, game, action.now);
      return set({ fuse: { ...fuse, timer: changeTimer(fuse.timer, "resume", action.now) }, passedAt: action.now });
    case "bang":
      return running && timeLeft(fuse.timer, action.now) === 0 ? bang(room, game, action.now) : room;
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
const STAGES: readonly Stage[] = ["ready", "burning", "bang"];

function parseOptions(v: unknown): Options {
  if (!isObject(v)) return DEFAULT_OPTIONS;
  const d = DEFAULT_OPTIONS;
  return {
    lives: isNumber(v.lives) ? Math.min(3, Math.max(1, Math.round(v.lives))) : d.lives,
    fuse: isFuseLength(v.fuse) ? v.fuse : d.fuse,
    packs: Array.isArray(v.packs) ? PACK_IDS.filter((id) => (v.packs as unknown[]).includes(id)) : d.packs,
    english: typeof v.english === "boolean" ? v.english : d.english,
    sound: typeof v.sound === "boolean" ? v.sound : d.sound,
  };
}

function parseFuse(v: unknown): Fuse | null {
  if (!isObject(v) || !isNumber(v.length) || !isNumber(v.hurry) || !isObject(v.timer)) return null;
  const { endsAt, left } = v.timer;
  if (!isNumber(left) || !(endsAt === null || isNumber(endsAt))) return null;
  return { length: v.length, hurry: v.hurry, timer: { endsAt, left } };
}

function parseGame(v: unknown, players: readonly Player[], now: number): Game | null {
  if (!isObject(v) || !STAGES.includes(v.stage as Stage) || !isStrings(v.seats) || !isNumbers(v.lives)) return null;
  if (!isString(v.holder) || !isNumber(v.round) || !isNumber(v.passes)) return null;
  const { seats, lives } = v;
  // Players are only added or removed between games; drop a game that doesn't match the table.
  if (seats.length === 0 || !seats.every((id) => players.some((p) => p.id === id) && isNumber(lives[id]))) return null;
  if (!seats.includes(v.holder)) return null;
  const stage = v.stage as Stage;
  const prompt = isString(v.prompt) ? v.prompt : null;
  let fuse = parseFuse(v.fuse);
  if (stage === "burning" && (prompt === null || fuse === null)) return null;
  // Still burning in the save: the page went away without pausing it. It comes back paused.
  if (stage === "burning" && fuse && fuse.timer.endsAt !== null) {
    fuse = { ...fuse, timer: { endsAt: null, left: Math.max(RELOAD_LEFT_MS, timeLeft(fuse.timer, now)) } };
  }
  return {
    seats,
    lives,
    round: v.round,
    stage,
    holder: v.holder,
    prompt,
    fuse,
    passes: v.passes,
    passedAt: isNumber(v.passedAt) ? v.passedAt : null,
    bangAt: isNumber(v.bangAt) ? v.bangAt : null,
  };
}

/** A saved room, or null if there's nothing usable (then the game starts fresh). */
export function parseRoom(raw: string | null, now = Date.now()): Room | null {
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
    wins: isNumbers(v.wins) ? v.wins : {},
    played: isNumber(v.played) ? v.played : 0,
    starts: isLedger(v.starts) ? v.starts : {},
    used: isStrings(v.used) ? v.used : [],
    game: parseGame(v.game, players, now),
  };
}
