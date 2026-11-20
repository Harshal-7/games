import type { Ledger } from "@/party/logic/fair";
import { tooFew, updatePlayers, type Player, type PlayerAction } from "@/party/logic/players";
import type { Rng } from "@/party/logic/random";
import { changeTimer, type Timer, type TimerOp } from "@/party/logic/timer";

import {
  dealRoles,
  LIMITS,
  mafiaCount,
  MAFIA_CHOICES,
  NO_LEDGERS,
  ROLES,
  settleRoles,
  type Cast,
  type Ledgers,
  type NightRole,
  type Role,
} from "./roles";
import { pickStory } from "./script";

/**
 * A room is one group playing game after game of Mafia on one phone: the players, the
 * options, the fair-pick ledgers, the scores and the game in progress. Everything here
 * is plain data, saved in the browser, so a reload comes back to the same screen, even
 * in the middle of the night.
 */

/** Where the room is saved in this browser. */
export const ROOM_KEY = "games:mafia:room:v1";

/* ---------- The night's clock ---------- */

/** "Night falls. Everyone, close your eyes." Then a moment to put the phone down. */
export const DUSK_MS = 6_000;
/**
 * Every role's turn takes at least this long, plus a random bit, however fast its tap:
 * the timing gives nothing away, and a role that's out is called with the same wait.
 */
export const STEP_MS = 10_000;
export const JITTER_MS = 5_000;
/** The Police's answer stays on screen this long, silently. */
export const RESULT_MS = 3_000;
/** "Doctor, close your eyes." Then a beat before the next call. */
export const CLOSE_MS = 3_500;

/* ---------- Options ---------- */

export type Tie = "nobody" | "again";
export const TIES: readonly Tie[] = ["nobody", "again"];
export const TALK_MINUTES = [2, 3, 5] as const;

export type Options = {
  /** How many Mafia; null deals them by table size. */
  mafia: number | null;
  doctor: boolean;
  police: boolean;
  /** Talking time each day, in minutes. */
  talk: number;
  /** A tied vote: no one is out, or the table points once more first. */
  tie: Tie;
  /** The narrator reads every line out loud; off, the lines only show. */
  voice: boolean;
  sound: boolean;
};

export const DEFAULT_OPTIONS: Options = {
  mafia: null,
  doctor: true,
  police: true,
  talk: 3,
  tie: "nobody",
  voice: true,
  sound: true,
};

export function talkMs(options: Options): number {
  return options.talk * 60_000;
}

/* ---------- A game ---------- */

/**
 * deal    → the phone goes round, everyone holds their card once
 * night   → the narrator calls the Mafia, the Doctor and the Police in turn
 * morning → who the Mafia got, as a story, and their role
 * day     → the table talks against the clock
 * vote    → everyone points on three; the most fingers is out
 * verdict → who's out and what they were (or nobody, on a tie)
 * end     → every card face up and the night log
 */
export type Stage = "deal" | "night" | "morning" | "day" | "vote" | "verdict" | "end";
export const STAGES: readonly Stage[] = ["deal", "night", "morning", "day", "vote", "verdict", "end"];

/** ready → waiting for the tap that starts the night; dusk → eyes closing; then each role. */
export type Step = "ready" | "dusk" | NightRole;
const STEPS: readonly Step[] = ["ready", "dusk", "mafia", "doctor", "police"];

export type Night = {
  step: Step;
  /** A role's turn: "open" from its call until it's done, then "close" ("…close your eyes"). */
  phase: "open" | "close";
  /** When the current line was said. */
  since: number;
  /** The earliest a role's turn can end. */
  until: number;
  /** When the role confirmed its pick; null until then, and for a role that's out. */
  doneAt: number | null;
  kill: string | null;
  save: string | null;
  check: string | null;
};

/** Someone who's out: when, and how (the Mafia at night, or the vote by day). */
export type Exit = { id: string; round: number; when: "night" | "day" };

/** One night, for the morning and the log at the end. */
export type NightLog = {
  round: number;
  kill: string | null;
  save: string | null;
  check: string | null;
  died: string | null;
  /** The morning's story ({name} not filled in), or null when nobody died. */
  story: string | null;
};

export type Winner = "town" | "mafia";

export type Game = {
  number: number;
  stage: Stage;
  /** Everyone playing, in seating order. */
  seats: string[];
  roles: Record<string, Role>;
  /** Deal: whose card is next, whether it's on screen, and how often each card was opened. */
  turn: number;
  looking: boolean;
  opens: Record<string, number>;
  /** Night n, then day n. 0 while dealing. */
  round: number;
  night: Night | null;
  /** Who the Doctor saved last night, who can't be saved again tonight. */
  lastSave: string | null;
  out: Exit[];
  log: NightLog[];
  timer: Timer | null;
  /** Tied votes today. */
  ties: number;
  /** Points from this game, once it's over. */
  points: Record<string, number>;
};

export type Room = {
  version: 1;
  players: Player[];
  options: Options;
  ledgers: Ledgers;
  scores: Record<string, number>;
  played: number;
  /** Morning stories this room has heard, so none repeats until they've all been told. */
  told: string[];
  game: Game | null;
};

export function newRoom(players: Player[] = [], options: Options = DEFAULT_OPTIONS): Room {
  return { version: 1, players, options, ledgers: NO_LEDGERS, scores: {}, played: 0, told: [], game: null };
}

/* ---------- Questions about a game ---------- */

export function isOut(game: Game, id: string): boolean {
  return game.out.some((exit) => exit.id === id);
}

/** Who's still in, in seating order. */
export function alive(game: Game): string[] {
  return game.seats.filter((id) => !isOut(game, id));
}

export function holders(game: Game, role: Role): string[] {
  return game.seats.filter((id) => game.roles[id] === role);
}

/** Whether a role was dealt this game (the Doctor and the Police can be switched off). */
export function inGame(game: Game, role: Role): boolean {
  return game.seats.some((id) => game.roles[id] === role);
}

/** Every player with this role is out. Their turn still comes, with the same wait. */
export function roleOut(game: Game, role: Role): boolean {
  return !alive(game).some((id) => game.roles[id] === role);
}

/** The night's calls in order: the Mafia, then the Doctor and the Police when they're in the game. */
export function nightRoles(game: Game): NightRole[] {
  return (["mafia", "doctor", "police"] as const).filter((role) => inGame(game, role));
}

/**
 * Who a role can pick tonight. The Mafia go for anyone who isn't Mafia. The Doctor can
 * save anyone, themselves too, except whoever they saved last night. The Police check
 * anyone but themselves.
 */
export function targets(game: Game, role: NightRole): string[] {
  const living = alive(game);
  if (role === "mafia") return living.filter((id) => game.roles[id] !== "mafia");
  if (role === "doctor") return living.filter((id) => id !== game.lastSave);
  return living.filter((id) => game.roles[id] !== "police");
}

/** The town wins once every Mafia is out; the Mafia win once they're as many as everyone else. */
export function winnerOf(game: Game): Winner | null {
  const living = alive(game);
  const mafia = living.filter((id) => game.roles[id] === "mafia").length;
  if (mafia === 0) return "town";
  if (mafia >= living.length - mafia) return "mafia";
  return null;
}

/** Who the vote put out today, if anyone. */
export function votedOut(game: Game): string | null {
  return game.out.find((exit) => exit.when === "day" && exit.round === game.round)?.id ?? null;
}

/** Last night, once it's over. */
export function lastNight(game: Game): NightLog | null {
  return game.log.at(-1) ?? null;
}

/** What the Police see once they've picked tonight: Mafia or not. */
export function policeAnswer(game: Game): "mafia" | "not-mafia" | null {
  const check = game.night?.check;
  if (!check) return null;
  return game.roles[check] === "mafia" ? "mafia" : "not-mafia";
}

export function cast(room: Room): Cast {
  return {
    mafia: mafiaCount(room.players.length, room.options.mafia),
    doctor: room.options.doctor,
    police: room.options.police,
  };
}

/** Why a game can't start yet, or null. */
export function startProblem(room: Room): string | null {
  if (room.players.length > LIMITS.max) return `Mafia takes ${LIMITS.max} players at most.`;
  return tooFew(room.players, LIMITS.min);
}

/* ---------- Changes ---------- */

const READY: Night = { step: "ready", phase: "open", since: 0, until: 0, doneAt: null, kill: null, save: null, check: null };

function dusk(now: number): Night {
  return { ...READY, step: "dusk", since: now, until: now };
}

/** A role's call: its turn can't end before 10 seconds plus a random few. */
function call(role: NightRole, now: number, rng: Rng): Partial<Night> {
  return { step: role, phase: "open", since: now, until: now + STEP_MS + Math.floor(rng() * JITTER_MS), doneAt: null };
}

function deal(room: Room, rng: Rng): Game {
  const seats = room.players.map((p) => p.id);
  return {
    number: room.played + 1,
    stage: "deal",
    seats,
    roles: dealRoles(seats, cast(room), room.ledgers, rng),
    turn: 0,
    looking: false,
    opens: Object.fromEntries(seats.map((id) => [id, 0])),
    round: 0,
    night: null,
    lastSave: null,
    out: [],
    log: [],
    timer: null,
    ties: 0,
    points: {},
  };
}

/** Whether a role's turn is over: it picked (or is out), the wait has passed, and the Police have seen their answer. */
function turnOver(game: Game, night: Night, now: number): boolean {
  const role = night.step as NightRole;
  const out = roleOut(game, role);
  if (!out && night.doneAt === null) return false;
  if (now < night.until) return false;
  return role !== "police" || night.doneAt === null || now >= night.doneAt + RESULT_MS;
}

/** Morning: the Mafia's pick is out unless the Doctor saved them. */
function dawn(room: Room, game: Game, night: Night, rng: Rng): Room {
  const died = night.kill !== null && night.kill !== night.save ? night.kill : null;
  const told = died ? pickStory(room.told, rng) : null;
  return {
    ...room,
    told: told ? told.told : room.told,
    game: {
      ...game,
      stage: "morning",
      night: null,
      lastSave: night.save,
      out: died ? [...game.out, { id: died, round: game.round, when: "night" }] : game.out,
      log: [
        ...game.log,
        { round: game.round, kill: night.kill, save: night.save, check: night.check, died, story: told?.story ?? null },
      ],
    },
  };
}

/** The clock moves the night on: dusk to the first call, a finished turn to its close, a close to the next call. */
function tick(room: Room, game: Game, night: Night, now: number, rng: Rng): Room {
  const setNight = (patch: Partial<Night>): Room => ({ ...room, game: { ...game, night: { ...night, ...patch } } });
  const roles = nightRoles(game);
  switch (night.step) {
    case "ready":
      return room;
    case "dusk":
      return now >= night.since + DUSK_MS ? setNight(call(roles[0], now, rng)) : room;
  }
  if (night.phase === "open") return turnOver(game, night, now) ? setNight({ phase: "close", since: now }) : room;
  if (now < night.since + CLOSE_MS) return room;
  const next = roles[roles.indexOf(night.step) + 1];
  return next ? setNight(call(next, now, rng)) : dawn(room, game, night, rng);
}

function without<T>(record: Record<string, T>, id: string): Record<string, T> {
  return Object.fromEntries(Object.entries(record).filter(([key]) => key !== id));
}

export type Action =
  | PlayerAction
  | { type: "options"; patch: Partial<Options> }
  | { type: "start"; rng: Rng }
  | { type: "look" }
  | { type: "back" }
  | { type: "open"; id: string }
  | { type: "done" }
  | { type: "redeal"; rng: Rng }
  /** The tap that starts a night: after the deal, or after a day's verdict. */
  | { type: "nightfall"; now: number }
  /** A role confirms its pick for the night. */
  | { type: "pick"; id: string; now: number }
  | { type: "tick"; now: number; rng: Rng }
  /** After a reload mid-night: the current line again, with a fresh wait. */
  | { type: "resume"; now: number; rng: Rng }
  | { type: "day"; now: number }
  | { type: "timer"; op: TimerOp; now: number }
  | { type: "vote" }
  | { type: "talk" }
  /** Whoever got the most fingers, or null for a tie. */
  | { type: "vote-out"; id: string | null }
  /** On to the end, once someone has won. */
  | { type: "finish" }
  | { type: "lobby" }
  | { type: "new-room" }
  | { type: "clear-room" };

/** The whole game as one function: room + action → next room. Bad actions change nothing. */
export function reduce(room: Room, action: Action): Room {
  const game = room.game;
  switch (action.type) {
    case "add-player":
    case "quick-players":
    case "rename-player": {
      // Names can change any time; who's at the table only between games.
      if (game && action.type !== "rename-player") return room;
      const players = updatePlayers(room.players, action, LIMITS);
      return players === room.players ? room : { ...room, players };
    }
    case "remove-player": {
      if (game) return room;
      const { ledgers } = room;
      return {
        ...room,
        players: updatePlayers(room.players, action, LIMITS),
        scores: without(room.scores, action.id),
        ledgers: {
          mafia: without(ledgers.mafia, action.id),
          doctor: without(ledgers.doctor, action.id),
          police: without(ledgers.police, action.id),
        },
      };
    }
    case "options":
      return { ...room, options: { ...room.options, ...action.patch } };
    case "start":
      return game || startProblem(room) ? room : { ...room, game: deal(room, action.rng) };
    case "lobby":
      return game ? { ...room, game: null } : room;
    case "new-room":
      return newRoom(room.players, room.options);
    case "clear-room":
      // Reset: no players, games or scores left; the options stay as they were.
      return newRoom([], room.options);
  }

  if (!game) return room;
  const set = (patch: Partial<Game>): Room => ({ ...room, game: { ...game, ...patch } });
  const night = game.night;
  const current = game.seats[game.turn];

  switch (action.type) {
    case "look":
      return game.stage === "deal" && !game.looking ? set({ looking: true }) : room;
    case "back":
      // Only before opening: once a card is open, the next screen is the next player.
      return game.stage === "deal" && game.looking && game.opens[current] === 0 ? set({ looking: false }) : room;
    case "open":
      return game.stage === "deal" && game.looking && action.id === current
        ? set({ opens: { ...game.opens, [current]: (game.opens[current] ?? 0) + 1 } })
        : room;
    case "done":
      if (game.stage !== "deal" || !game.looking || game.opens[current] === 0) return room;
      if (game.turn + 1 < game.seats.length) return set({ turn: game.turn + 1, looking: false });
      // Everyone has their card: the game counts from here, so the fair picks are booked now.
      return {
        ...room,
        ledgers: settleRoles(game.seats, game.roles, room.ledgers),
        game: { ...game, stage: "night", looking: false, round: 1, night: READY },
      };
    case "redeal":
      // Someone saw a card that wasn't theirs: new roles for everyone. The ledgers don't change.
      return game.stage === "deal" ? { ...room, game: deal(room, action.rng) } : room;

    case "nightfall":
      if (game.stage === "night" && night?.step === "ready") return set({ night: dusk(action.now) });
      if (game.stage === "verdict" && !winnerOf(game)) {
        return set({ stage: "night", round: game.round + 1, night: dusk(action.now), timer: null, ties: 0 });
      }
      return room;
    case "pick": {
      if (game.stage !== "night" || !night || night.phase !== "open" || night.doneAt !== null) return room;
      if (night.step === "ready" || night.step === "dusk") return room;
      const role = night.step;
      if (roleOut(game, role) || !targets(game, role).includes(action.id)) return room;
      const field = role === "mafia" ? "kill" : role === "doctor" ? "save" : "check";
      return set({ night: { ...night, [field]: action.id, doneAt: action.now } });
    }
    case "tick":
      return game.stage === "night" && night ? tick(room, game, night, action.now, action.rng) : room;
    case "resume": {
      if (game.stage !== "night" || !night || night.step === "ready") return room;
      if (night.step === "dusk") return set({ night: dusk(action.now) });
      // Still waiting on the role: call it again. Already picked: straight to "close your eyes".
      const again =
        night.phase === "open" && night.doneAt === null
          ? call(night.step, action.now, action.rng)
          : { phase: "close" as const, since: action.now };
      return set({ night: { ...night, ...again } });
    }

    case "day": {
      if (game.stage !== "morning" || winnerOf(game)) return room;
      const ms = talkMs(room.options);
      return set({ stage: "day", timer: { endsAt: action.now + ms, left: ms }, ties: 0 });
    }
    case "timer":
      return (game.stage === "day" || game.stage === "vote") && game.timer
        ? set({ timer: changeTimer(game.timer, action.op, action.now) })
        : room;
    case "vote":
      return game.stage === "day" ? set({ stage: "vote" }) : room;
    case "talk":
      return game.stage === "vote" ? set({ stage: "day" }) : room;
    case "vote-out": {
      if (game.stage !== "vote") return room;
      if (action.id === null) {
        // A tie: point once more first (if that's the room's rule), then nobody is out.
        if (room.options.tie === "again" && game.ties === 0) return set({ ties: 1 });
        return set({ stage: "verdict", ties: game.ties + 1 });
      }
      if (isOut(game, action.id) || !game.seats.includes(action.id)) return room;
      return set({ stage: "verdict", out: [...game.out, { id: action.id, round: game.round, when: "day" }] });
    }
    case "finish": {
      if (game.stage !== "morning" && game.stage !== "verdict") return room;
      const winner = winnerOf(game);
      if (!winner) return room;
      // The winning side scores, like Imposter: every town player 1, every Mafia 2 (they're outnumbered).
      const points: Record<string, number> = {};
      for (const id of game.seats) {
        const mafia = game.roles[id] === "mafia";
        if (winner === "mafia" && mafia) points[id] = 2;
        if (winner === "town" && !mafia) points[id] = 1;
      }
      const scores = { ...room.scores };
      for (const [id, gained] of Object.entries(points)) scores[id] = (scores[id] ?? 0) + gained;
      return { ...room, scores, played: room.played + 1, game: { ...game, stage: "end", points } };
    }
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
const oneOf = <T>(list: readonly T[], v: unknown): v is T => list.includes(v as T);

function parseOptions(v: unknown): Options {
  if (!isObject(v)) return DEFAULT_OPTIONS;
  const d = DEFAULT_OPTIONS;
  const bool = (x: unknown, fallback: boolean) => (typeof x === "boolean" ? x : fallback);
  return {
    mafia: v.mafia === null || oneOf(MAFIA_CHOICES, v.mafia) ? (v.mafia as number | null) : d.mafia,
    doctor: bool(v.doctor, d.doctor),
    police: bool(v.police, d.police),
    talk: oneOf(TALK_MINUTES, v.talk) ? v.talk : d.talk,
    tie: oneOf(TIES, v.tie) ? v.tie : d.tie,
    voice: bool(v.voice, d.voice),
    sound: bool(v.sound, d.sound),
  };
}

function parseLedgers(v: unknown): Ledgers {
  if (!isObject(v)) return NO_LEDGERS;
  return {
    mafia: isLedger(v.mafia) ? v.mafia : {},
    doctor: isLedger(v.doctor) ? v.doctor : {},
    police: isLedger(v.police) ? v.police : {},
  };
}

function parseGame(v: unknown, players: readonly Player[]): Game | null {
  if (!isObject(v) || !oneOf(STAGES, v.stage) || !isNumber(v.number) || !isNumber(v.round)) return null;
  const seats = v.seats;
  // A player removed mid-game can't happen in the app; drop the game if it did.
  if (!isStrings(seats) || seats.length === 0 || new Set(seats).size !== seats.length) return null;
  if (!seats.every((id) => players.some((p) => p.id === id))) return null;
  const seat = (x: unknown): x is string => isString(x) && seats.includes(x);
  const seatOrNull = (x: unknown): x is string | null => x === null || seat(x);

  const roles = v.roles;
  if (!isObject(roles) || !seats.every((id) => oneOf(ROLES, roles[id]))) return null;
  if (!isNumber(v.turn) || v.turn < 0 || v.turn >= seats.length || typeof v.looking !== "boolean") return null;
  if (!isNumbers(v.opens) || !isNumber(v.ties) || !isNumbers(v.points) || !seatOrNull(v.lastSave)) return null;

  let night: Night | null = null;
  if (v.night !== null) {
    const n = v.night;
    if (!isObject(n) || !oneOf(STEPS, n.step) || !oneOf(["open", "close"] as const, n.phase)) return null;
    if (!isNumber(n.since) || !isNumber(n.until) || !(n.doneAt === null || isNumber(n.doneAt))) return null;
    if (!seatOrNull(n.kill) || !seatOrNull(n.save) || !seatOrNull(n.check)) return null;
    night = { step: n.step, phase: n.phase, since: n.since, until: n.until, doneAt: n.doneAt, kill: n.kill, save: n.save, check: n.check };
  }
  if ((v.stage === "night") !== (night !== null)) return null;

  if (!Array.isArray(v.out) || !Array.isArray(v.log)) return null;
  const out: Exit[] = [];
  for (const e of v.out) {
    if (!isObject(e) || !seat(e.id) || !isNumber(e.round) || !oneOf(["night", "day"] as const, e.when)) return null;
    out.push({ id: e.id, round: e.round, when: e.when });
  }
  const log: NightLog[] = [];
  for (const e of v.log) {
    if (!isObject(e) || !isNumber(e.round) || !seatOrNull(e.kill) || !seatOrNull(e.save)) return null;
    if (!seatOrNull(e.check) || !seatOrNull(e.died) || !(e.story === null || isString(e.story))) return null;
    log.push({ round: e.round, kill: e.kill, save: e.save, check: e.check, died: e.died, story: e.story });
  }

  const t = v.timer;
  const timer =
    isObject(t) && isNumber(t.left) && (t.endsAt === null || isNumber(t.endsAt))
      ? { endsAt: t.endsAt as number | null, left: t.left }
      : null;

  return {
    number: v.number,
    stage: v.stage,
    seats,
    roles: Object.fromEntries(seats.map((id) => [id, roles[id] as Role])),
    turn: v.turn,
    looking: v.looking,
    opens: v.opens,
    round: v.round,
    night,
    lastSave: v.lastSave,
    out,
    log,
    timer,
    ties: v.ties,
    points: v.points,
  };
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
    ledgers: parseLedgers(v.ledgers),
    scores: isNumbers(v.scores) ? v.scores : {},
    played: isNumber(v.played) ? v.played : 0,
    told: isStrings(v.told) ? v.told : [],
    game: parseGame(v.game, players),
  };
}
