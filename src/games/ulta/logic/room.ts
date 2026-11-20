import { updatePlayers, type Limits, type Player, type PlayerAction } from "@/party/logic/players";
import type { Rng } from "@/party/logic/random";
import { changeTimer, timeLeft, type Timer, type TimerOp } from "@/party/logic/timer";

import { drawSong, songKey, type Song } from "./songs";

/**
 * A room is one group playing Ulta on one phone: the players, the two teams, the options
 * and the game under way. Plain data, saved in the browser, so a reload comes back to the
 * same step. The recordings are never in here: they live in the page's memory only
 * (ui/takes.ts), and a reload that lost them sends the turn back to singing.
 *
 * 4 or more players split into two teams and play for points, with steals. 2 or 3 play
 * for fun: everyone takes turns singing and copying, and there's no score.
 */

export const LIMITS: Limits = { min: 2, max: 20 };
/** From this many players on, it's two teams with points. */
export const TEAM_PLAYERS = 4;

export const TARGETS = [5, 7, 10] as const;
/** The guess, on the ring timer. */
export const GUESS_MS = 45_000;
/** How many times the copier can hear the backwards line. */
export const LISTENS = 3;
/** The singer's take: at least this much sound, at most this long. */
export const SING_MIN_S = 2;
export const SING_MAX_S = 10;
/** The copy may run this much longer than the line it copies. */
export const COPY_EXTRA_S = 2;
/** A copy needs at least this much sound. */
export const COPY_MIN_S = 1;

export type TeamId = "a" | "b";
export const TEAM_IDS: readonly TeamId[] = ["a", "b"];
/** Straight and backwards. */
export const TEAM_NAMES: Record<TeamId, string> = { a: "Seedha", b: "Ulta" };

export const other = (team: TeamId): TeamId => (team === "a" ? "b" : "a");

export type Options = {
  /** Points to win. */
  target: number;
  /** The ticks and the time's-up buzz. The recordings always play. */
  sound: boolean;
};

export const DEFAULT_OPTIONS: Options = { target: 7, sound: true };

/**
 * pick   → the singer picks a song: their own, or one from "Suggest one"
 * sing   → the singer records the line
 * copy   → the copier hears it backwards (up to 3 times) and records a copy
 * guess  → the team hears the copy flipped forwards and guesses, on the clock
 * steal  → they missed: the other team gets one guess (teams only)
 * reveal → the original and the ulta version, back to back
 */
export type Stage = "pick" | "sing" | "copy" | "guess" | "steal" | "reveal";

export type Result = "guessed" | "stolen" | "missed";

export type Turn = {
  /** 1, 2, 3… in this game. */
  number: number;
  /** Whose turn it is; null when playing for fun. */
  team: TeamId | null;
  singer: string;
  copier: string;
  stage: Stage;
  /** The suggested song, or null for the singer's own pick. */
  song: Song | null;
  /** How many times the song card was held open. */
  opens: number;
  /** How many times the copier has heard the backwards line. */
  listens: number;
  guess: Timer;
  result: Result | null;
};

export type Game = {
  mode: "teams" | "fun";
  /** Singing order: each team's players, or everyone when playing for fun. */
  order: Partial<Record<TeamId, string[]>> & { all?: string[] };
  /** Turns sung so far, per team ("all" when playing for fun): who sings next. */
  sung: Partial<Record<TeamId | "all", number>>;
  /** Where each team's (or everyone's) singing order starts, picked at random. */
  start: Partial<Record<TeamId | "all", number>>;
  scores: Record<TeamId, number>;
  turn: Turn;
  /** The game is over: someone reached the target and the last turn is done. */
  over: boolean;
};

export type Room = {
  version: 1;
  players: Player[];
  /** Which team each player is on. Only used with 4 or more players. */
  teams: Record<string, TeamId>;
  options: Options;
  /** Songs already suggested in this room, so none comes back until the list runs out. */
  used: string[];
  game: Game | null;
};

export function newRoom(players: Player[] = [], options: Options = DEFAULT_OPTIONS, teams: Record<string, TeamId> = {}): Room {
  return { version: 1, players, teams: balanced(players, teams), options, used: [], game: null };
}

/** Whether this many players play as two teams. */
export const playsInTeams = (count: number) => count >= TEAM_PLAYERS;

/** Each team's players, in the order of the player list. */
export function teamPlayers(room: Pick<Room, "players" | "teams">, team: TeamId): Player[] {
  return room.players.filter((p) => room.teams[p.id] === team);
}

/**
 * Every player on a team: anyone new goes to the smaller team (Seedha on a tie), and
 * anyone who left is dropped. Teams that were picked stay as they are.
 */
export function balanced(players: readonly Player[], teams: Record<string, TeamId>): Record<string, TeamId> {
  const next: Record<string, TeamId> = {};
  const size = { a: 0, b: 0 };
  for (const p of players) {
    const team = teams[p.id];
    if (team === "a" || team === "b") {
      next[p.id] = team;
      size[team]++;
    }
  }
  for (const p of players) {
    if (next[p.id]) continue;
    const team: TeamId = size.b < size.a ? "b" : "a";
    next[p.id] = team;
    size[team]++;
  }
  return next;
}

/** Teams split at random, as even as they can be. */
function shuffled(players: readonly Player[], rng: Rng): Record<string, TeamId> {
  const ids = players.map((p) => p.id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  // Which team gets the odd one out is random too.
  const first: TeamId = rng() < 0.5 ? "a" : "b";
  return Object.fromEntries(ids.map((id, i) => [id, i % 2 === 0 ? first : other(first)]));
}

/** Why a game can't start yet, or null. */
export function startProblem(room: Room): string | null {
  const count = room.players.length;
  if (count < LIMITS.min) {
    const missing = LIMITS.min - count;
    return `Add ${missing} more ${missing === 1 ? "player" : "players"} to start.`;
  }
  if (!playsInTeams(count)) return null;
  for (const team of TEAM_IDS) {
    if (teamPlayers(room, team).length < 2) return `Team ${TEAM_NAMES[team]} needs 2 players: one sings, one copies.`;
  }
  return null;
}

/** The team that reached the target, once a turn is done. */
export function winner(game: Game, target: number): TeamId | null {
  if (game.mode !== "teams") return null;
  const { a, b } = game.scores;
  if (Math.max(a, b) < target || a === b) return null;
  return a > b ? "a" : "b";
}

/** Who sings and who copies next for a team (or everyone): the next in line, and the one after them. */
function nextPair(game: Pick<Game, "order" | "sung" | "start">, key: TeamId | "all"): { singer: string; copier: string } {
  const order = (key === "all" ? game.order.all : game.order[key]) ?? [];
  const at = (game.start[key] ?? 0) + (game.sung[key] ?? 0);
  return { singer: order[at % order.length], copier: order[(at + 1) % order.length] };
}

function newTurn(game: Omit<Game, "turn">, number: number, team: TeamId | null): Turn {
  const { singer, copier } = nextPair(game, team ?? "all");
  return {
    number,
    team,
    singer,
    copier,
    stage: "pick",
    song: null,
    opens: 0,
    listens: 0,
    guess: { endsAt: null, left: GUESS_MS },
    result: null,
  };
}

function newGame(room: Room, rng: Rng): Game {
  const random = (n: number) => Math.floor(rng() * n);
  if (!playsInTeams(room.players.length)) {
    const all = room.players.map((p) => p.id);
    const base = { mode: "fun" as const, order: { all }, sung: { all: 0 }, start: { all: random(all.length) }, scores: { a: 0, b: 0 }, over: false };
    return { ...base, turn: newTurn(base, 1, null) };
  }
  const a = teamPlayers(room, "a").map((p) => p.id);
  const b = teamPlayers(room, "b").map((p) => p.id);
  const base = {
    mode: "teams" as const,
    order: { a, b },
    sung: { a: 0, b: 0 },
    start: { a: random(a.length), b: random(b.length) },
    scores: { a: 0, b: 0 },
    over: false,
  };
  return { ...base, turn: newTurn(base, 1, rng() < 0.5 ? "a" : "b") };
}

export type Action =
  | PlayerAction
  | { type: "move-player"; id: string }
  | { type: "shuffle-teams"; rng: Rng }
  | { type: "options"; patch: Partial<Options> }
  | { type: "start"; rng: Rng }
  /** The singer will sing a song of their own. */
  | { type: "own-song" }
  /** "Suggest one", or another one. */
  | { type: "suggest"; rng: Rng }
  | { type: "open-song" }
  | { type: "sing" }
  /** The singer's take is in: over to the copier. */
  | { type: "sung" }
  | { type: "listen" }
  /** The copy is in: the team hears it and the clock starts. */
  | { type: "copied"; now: number }
  | { type: "timer"; op: TimerOp; now: number }
  /** The singer says the team got it, before the time ran out. */
  | { type: "guessed"; now: number }
  /** Missed, or time ran out: over to the other team to steal, or to the reveal. */
  | { type: "missed"; now: number }
  | { type: "stolen" }
  | { type: "not-stolen" }
  | { type: "next" }
  /** The recordings were lost (the page reloaded): sing it again. */
  | { type: "lost" }
  | { type: "lobby" }
  | { type: "new-room" }
  | { type: "clear-room" };

/** The whole game as one function: room + action → next room. Actions that don't apply change nothing. */
export function reduce(room: Room, action: Action): Room {
  const game = room.game;
  switch (action.type) {
    case "add-player":
    case "quick-players":
    case "rename-player":
    case "remove-player": {
      // Names can change any time; who's playing only between games.
      if (game && action.type !== "rename-player") return room;
      const players = updatePlayers(room.players, action, LIMITS);
      if (players === room.players) return room;
      return { ...room, players, teams: balanced(players, room.teams) };
    }
    case "move-player": {
      const team = room.teams[action.id];
      if (game || !team) return room;
      return { ...room, teams: { ...room.teams, [action.id]: other(team) } };
    }
    case "shuffle-teams":
      if (game || room.players.length < 2) return room;
      return { ...room, teams: shuffled(room.players, action.rng) };
    case "options":
      return { ...room, options: { ...room.options, ...action.patch } };
    case "start":
      if (startProblem(room) || (game && !game.over)) return room;
      return { ...room, game: newGame(room, action.rng) };
    case "lobby":
      return game ? { ...room, game: null } : room;
    case "new-room":
      return newRoom(room.players, room.options, room.teams);
    case "clear-room":
      return newRoom([], room.options);
  }

  if (!game || game.over) return room;
  const turn = game.turn;
  const setTurn = (patch: Partial<Turn>): Room => ({ ...room, game: { ...game, turn: { ...turn, ...patch } } });

  switch (action.type) {
    case "own-song":
      return turn.stage === "pick" ? setTurn({ song: null, stage: "sing" }) : room;
    case "suggest": {
      if (turn.stage !== "pick") return room;
      const song = drawSong(room.used, action.rng);
      return {
        ...room,
        used: [...room.used.filter((key) => key !== songKey(song)), songKey(song)],
        game: { ...game, turn: { ...turn, song, opens: 0 } },
      };
    }
    case "open-song":
      return turn.stage === "pick" && turn.song ? setTurn({ opens: turn.opens + 1 }) : room;
    case "sing":
      return turn.stage === "pick" && turn.song ? setTurn({ stage: "sing" }) : room;
    case "sung":
      return turn.stage === "sing" ? setTurn({ stage: "copy", listens: 0 }) : room;
    case "listen":
      return turn.stage === "copy" && turn.listens < LISTENS ? setTurn({ listens: turn.listens + 1 }) : room;
    case "copied":
      if (turn.stage !== "copy") return room;
      return setTurn({ stage: "guess", guess: { endsAt: action.now + GUESS_MS, left: GUESS_MS } });
    case "timer":
      return turn.stage === "guess" ? setTurn({ guess: changeTimer(turn.guess, action.op, action.now) }) : room;
    case "guessed": {
      if (turn.stage !== "guess" || timeLeft(turn.guess, action.now) === 0) return room;
      const scores = turn.team ? { ...game.scores, [turn.team]: game.scores[turn.team] + 1 } : game.scores;
      const guess = changeTimer(turn.guess, "pause", action.now);
      return { ...room, game: { ...game, scores, turn: { ...turn, stage: "reveal", result: "guessed", guess } } };
    }
    case "missed":
      if (turn.stage !== "guess") return room;
      return setTurn({
        stage: turn.team ? "steal" : "reveal",
        result: turn.team ? null : "missed",
        guess: changeTimer(turn.guess, "pause", action.now),
      });
    case "stolen": {
      if (turn.stage !== "steal" || !turn.team) return room;
      const thief = other(turn.team);
      const scores = { ...game.scores, [thief]: game.scores[thief] + 1 };
      return { ...room, game: { ...game, scores, turn: { ...turn, stage: "reveal", result: "stolen" } } };
    }
    case "not-stolen":
      return turn.stage === "steal" ? setTurn({ stage: "reveal", result: "missed" }) : room;
    case "next": {
      if (turn.stage !== "reveal") return room;
      const key = turn.team ?? "all";
      const sung = { ...game.sung, [key]: (game.sung[key] ?? 0) + 1 };
      if (winner(game, room.options.target)) return { ...room, game: { ...game, sung, over: true } };
      const team = turn.team ? other(turn.team) : null;
      const base = { ...game, sung };
      return { ...room, game: { ...base, turn: newTurn(base, turn.number + 1, team) } };
    }
    case "lost":
      // Only the steps that still need to play a recording go back.
      if (turn.stage !== "copy" && turn.stage !== "guess") return room;
      return setTurn({ stage: "sing", listens: 0, guess: { endsAt: null, left: GUESS_MS } });
  }
  return room;
}

/** Reads a saved room, or null when it can't be used. Older or broken saves start fresh. */
export function parseRoom(raw: string | null): Room | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as Partial<Room>;
    if (data?.version !== 1 || !Array.isArray(data.players)) return null;
    const players = data.players.filter(
      (p): p is Player => typeof p?.id === "string" && typeof p?.name === "string",
    );
    const options: Options = {
      target: TARGETS.includes(data.options?.target as (typeof TARGETS)[number]) ? data.options!.target : DEFAULT_OPTIONS.target,
      sound: typeof data.options?.sound === "boolean" ? data.options.sound : DEFAULT_OPTIONS.sound,
    };
    const teams = balanced(players, typeof data.teams === "object" && data.teams ? data.teams : {});
    const used = Array.isArray(data.used) ? data.used.filter((u): u is string => typeof u === "string") : [];
    const game = validGame(data.game, players) ? data.game : null;
    return { version: 1, players, teams, options, used, game };
  } catch {
    return null;
  }
}

const STAGES: readonly Stage[] = ["pick", "sing", "copy", "guess", "steal", "reveal"];

/** Whether a saved game still fits the players: anything odd drops the game, not the room. */
function validGame(game: unknown, players: readonly Player[]): game is Game {
  if (!game || typeof game !== "object") return false;
  const g = game as Game;
  const ids = new Set(players.map((p) => p.id));
  const turn = g.turn;
  if (g.mode !== "teams" && g.mode !== "fun") return false;
  if (typeof g.over !== "boolean" || !g.scores || typeof g.scores.a !== "number" || typeof g.scores.b !== "number") return false;
  const orders = g.mode === "fun" ? [g.order?.all] : [g.order?.a, g.order?.b];
  if (!orders.every((o) => Array.isArray(o) && o.length > 0 && o.every((id) => ids.has(id)))) return false;
  if (!turn || !STAGES.includes(turn.stage) || !ids.has(turn.singer) || !ids.has(turn.copier)) return false;
  if (typeof turn.listens !== "number" || typeof turn.guess?.left !== "number") return false;
  return true;
}
