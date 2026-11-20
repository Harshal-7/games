import { BOARDS, isBoardId, type Board, type BoardId, type Jump } from "./boards";

/** One game of Marble solitaire. Times are plain millisecond timestamps. */
export type Game = {
  /** New for every fresh board, so anything tied to an old board can be told apart. */
  id: number;
  board: BoardId;
  /** The jumps played, in order; the board is the start with these played on it. */
  moves: readonly Move[];
  undos: number;
  hints: number;
  /** What the current hint shows, until the next jump. */
  hint: Hint | null;
  /** Watch it solve made a jump, so this run doesn't count for best results. */
  assisted: boolean;
  startedAt: number | null;
  finishedAt: number | null;
};

/** A jump by where the marble starts and lands; the marble jumped over follows from those. */
export type Move = { from: number; to: number };

/** A jump to try, or "back": one marble can't be reached from here, so step back. */
export type Hint = Move | "back";

/** start: nothing played yet. over: no jump left. */
export type Phase = "start" | "playing" | "over";

export type Action =
  | { type: "jump"; from: number; to: number; now: number; auto?: boolean }
  /** Back to `to` jumps played (default: one jump back). */
  | { type: "undo"; to?: number }
  | { type: "hint"; hint: Hint }
  | { type: "restart" }
  | { type: "switch"; board: BoardId };

export function newGame(board: BoardId, id = 0): Game {
  return { id, board, moves: [], undos: 0, hints: 0, hint: null, assisted: false, startedAt: null, finishedAt: null };
}

/** The jump from one hole to another, if there is one on this board. */
export function jumpBetween(board: Board, from: number, to: number): Jump | undefined {
  return board.jumps.find((j) => j.from === from && j.to === to);
}

export function startMarbles(board: Board): boolean[] {
  return board.holes.map((_, h) => h !== board.start);
}

/** The marbles after these jumps, or null if one of them isn't a legal jump. */
export function marblesAfter(board: Board, moves: readonly Move[]): boolean[] | null {
  const marbles = startMarbles(board);
  for (const { from, to } of moves) {
    const jump = jumpBetween(board, from, to);
    if (!jump || !marbles[jump.from] || !marbles[jump.over] || marbles[jump.to]) return null;
    marbles[jump.from] = false;
    marbles[jump.over] = false;
    marbles[jump.to] = true;
  }
  return marbles;
}

/** The board as a game has it. Games are only ever made of legal jumps. */
export function marblesOf(game: Game): boolean[] {
  return marblesAfter(BOARDS[game.board], game.moves) ?? startMarbles(BOARDS[game.board]);
}

export function legalJumps(board: Board, marbles: readonly boolean[]): Jump[] {
  return board.jumps.filter((j) => marbles[j.from] && marbles[j.over] && !marbles[j.to]);
}

export function marbleCount(marbles: readonly boolean[]): number {
  return marbles.reduce((n, m) => n + (m ? 1 : 0), 0);
}

export function phaseOf(game: Game): Phase {
  if (game.moves.length === 0) return "start";
  return legalJumps(BOARDS[game.board], marblesOf(game)).length === 0 ? "over" : "playing";
}

export function reduce(game: Game, action: Action): Game {
  switch (action.type) {
    case "jump": {
      const board = BOARDS[game.board];
      const marbles = marblesOf(game);
      const jump = jumpBetween(board, action.from, action.to);
      if (!jump || !marbles[jump.from] || !marbles[jump.over] || marbles[jump.to]) return game;
      const next: Game = {
        ...game,
        moves: [...game.moves, { from: jump.from, to: jump.to }],
        hint: null,
        assisted: game.assisted || Boolean(action.auto),
        startedAt: game.startedAt ?? action.now,
      };
      next.finishedAt = phaseOf(next) === "over" ? action.now : null;
      return next;
    }
    case "undo": {
      const length = game.moves.length;
      if (length === 0) return game;
      const to = Math.max(0, Math.min(action.to ?? length - 1, length - 1));
      // Back to a full board is the same as a fresh start.
      if (to === 0) return newGame(game.board, game.id + 1);
      return { ...game, moves: game.moves.slice(0, to), undos: game.undos + (length - to), hint: null, finishedAt: null };
    }
    case "hint":
      if (sameHint(game.hint, action.hint)) return game;
      return { ...game, hint: action.hint, hints: game.hints + 1 };
    case "restart":
      return newGame(game.board, game.id + 1);
    case "switch":
      return action.board === game.board ? game : newGame(action.board, game.id + 1);
  }
}

function sameHint(a: Hint | null, b: Hint): boolean {
  if (a === null) return false;
  if (a === "back" || b === "back") return a === b;
  return a.from === b.from && a.to === b.to;
}

/** Time on the clock: from the first jump until the game ends (or now). */
export function elapsed(game: Game, now: number): number {
  if (game.startedAt === null) return 0;
  return Math.max(0, (game.finishedAt ?? now) - game.startedAt);
}

/** How a game ended: "Perfect", "Solved", "So close" or "Marbles left: N". */
export type Result = { kind: "perfect" | "solved" | "close" | "left"; left: number; title: string };

export function resultOf(board: Board, marbles: readonly boolean[]): Result {
  const left = marbleCount(marbles);
  if (left === 1) {
    return marbles[board.goal] ? { kind: "perfect", left, title: "Perfect" } : { kind: "solved", left, title: "Solved" };
  }
  if (left === 2) return { kind: "close", left, title: "So close" };
  return { kind: "left", left, title: `Marbles left: ${left}` };
}

const isCount = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0;
const isTime = (v: unknown): v is number | null => v === null || (typeof v === "number" && Number.isFinite(v) && v >= 0);

/**
 * Reads a saved game, or null when it can't be used. Every jump is played again, so a
 * save from an older or edited copy can never put an impossible board on screen.
 */
export function parseGame(raw: string | null): Game | null {
  if (!raw) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!data || typeof data !== "object") return null;
  const g = data as Record<string, unknown>;
  if (!isBoardId(g.board) || !Array.isArray(g.moves)) return null;
  if (![g.id, g.undos, g.hints].every(isCount) || !isTime(g.startedAt) || !isTime(g.finishedAt)) return null;
  const moves: Move[] = [];
  for (const move of g.moves) {
    const { from, to } = (move ?? {}) as Record<string, unknown>;
    if (!isCount(from) || !isCount(to)) return null;
    moves.push({ from, to });
  }
  const board = BOARDS[g.board];
  if (!marblesAfter(board, moves)) return null;
  let hint: Hint | null = null;
  if (g.hint === "back") hint = "back";
  else if (g.hint && typeof g.hint === "object") {
    const { from, to } = g.hint as Record<string, unknown>;
    if (isCount(from) && isCount(to)) hint = { from, to };
  }
  return {
    id: g.id as number,
    board: g.board,
    moves,
    undos: g.undos as number,
    hints: g.hints as number,
    hint,
    assisted: g.assisted === true,
    startedAt: moves.length ? (g.startedAt as number | null) : null,
    finishedAt: g.finishedAt as number | null,
  };
}
