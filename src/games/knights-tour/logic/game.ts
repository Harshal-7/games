import { legalMoves, type Size } from "./board";

/** One game of Knight's Tour. Times are plain millisecond timestamps. */
export type Game = {
  /** New for every fresh board, so anything tied to an old board can be told apart. */
  id: number;
  size: Size;
  /** Visited squares in order; the knight stands on the last one. */
  path: readonly number[];
  undos: number;
  hints: number;
  /** The square the current hint points at (or HINT_GO_BACK), until the knight moves. */
  hint: number | null;
  /** Watch it solve made a move, so this run doesn't count for best times. */
  assisted: boolean;
  startedAt: number | null;
  finishedAt: number | null;
};

/** A hint that isn't a square: the tour can't be finished from here, so step back. */
export const HINT_GO_BACK = -1;

export type Phase = "start" | "playing" | "won" | "stuck";

export type Action =
  | { type: "play"; square: number; now: number; auto?: boolean }
  /** Back to `to` squares visited (default: one step back). */
  | { type: "undo"; to?: number }
  | { type: "hint"; square: number }
  | { type: "restart" }
  | { type: "resize"; size: Size };

export function newGame(size: Size, id = 0): Game {
  return { id, size, path: [], undos: 0, hints: 0, hint: null, assisted: false, startedAt: null, finishedAt: null };
}

export function phaseOf(game: Game): Phase {
  const { path, size } = game;
  if (path.length === 0) return "start";
  if (path.length === size * size) return "won";
  return legalMoves(path, size).length === 0 ? "stuck" : "playing";
}

export function reduce(game: Game, action: Action): Game {
  switch (action.type) {
    case "play": {
      const phase = phaseOf(game);
      const { square, now } = action;
      if (phase === "won" || phase === "stuck") return game;
      if (phase === "start" && !(Number.isInteger(square) && square >= 0 && square < game.size * game.size)) return game;
      if (phase === "playing" && !legalMoves(game.path, game.size).includes(square)) return game;
      const next: Game = {
        ...game,
        path: [...game.path, square],
        hint: null,
        assisted: game.assisted || Boolean(action.auto),
        startedAt: game.startedAt ?? now,
      };
      const after = phaseOf(next);
      next.finishedAt = after === "won" || after === "stuck" ? now : null;
      return next;
    }
    case "undo": {
      const length = game.path.length;
      if (length === 0) return game;
      const to = Math.max(0, Math.min(action.to ?? length - 1, length - 1));
      // Taking the knight off the board is the same as a fresh start.
      if (to === 0) return newGame(game.size, game.id + 1);
      return { ...game, path: game.path.slice(0, to), undos: game.undos + (length - to), hint: null, finishedAt: null };
    }
    case "hint":
      if (game.hint === action.square) return game;
      return { ...game, hint: action.square, hints: game.hints + 1 };
    case "restart":
      return newGame(game.size, game.id + 1);
    case "resize":
      return newGame(action.size, game.id + 1);
  }
}

/** Time on the clock: from the first square until the tour ends (or now). */
export function elapsed(game: Game, now: number): number {
  if (game.startedAt === null) return 0;
  return Math.max(0, (game.finishedAt ?? now) - game.startedAt);
}
