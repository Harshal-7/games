import { BOARDS, type Board, type BoardId, type Jump } from "./boards";
import { BOOK } from "./book";
import { jumpBetween, legalJumps, marbleCount, marblesAfter, type Hint, type Move } from "./game";
import { analyse, DEFAULT_BUDGET, type Analysis, type Marbles, type Target } from "./solver";

/**
 * What Hint, the stuck card and Watch it solve know about a game, on top of the
 * solver: the book line from the start, answers remembered per position, and searches
 * that start over in a growing rhythm (Luby's: 1 1 2 1 1 2 4 …) with the jumps
 * shuffled a little, which finds an answer far sooner than one long search that took a
 * wrong turn early. Searches never forget the dead positions they found, so each try
 * picks up where the last left off.
 */

/** A first try is this many steps; later ones are multiples of it. */
const BASE_STEPS = 2_000;

function luby(i: number): number {
  let k = 1;
  while ((1 << k) - 1 < i) k++;
  return i === (1 << k) - 1 ? 1 << (k - 1) : luby(i - (1 << (k - 1)) + 1);
}

/**
 * Searches in tries until one settles it or `budget` steps are used. `round` picks
 * other shuffles, so asking again with the next round tries new ways.
 */
export function settle(board: Board, marbles: Marbles, target: Target, budget: number, round = 0): Analysis {
  let used = 0;
  for (let i = 1; used < budget; i++) {
    const steps = Math.min(budget - used, BASE_STEPS * luby(i));
    // The very first try is the plain one; every other is shuffled.
    const seed = round === 0 && i === 1 ? 0 : round * 1009 + i;
    const result = analyse(board, marbles, target, steps, seed);
    used += steps;
    if (result.status !== "unknown") return result;
  }
  return { status: "unknown" };
}

const bookCache = new Map<BoardId, readonly Jump[]>();

/** The book line as jumps. */
export function bookLine(board: Board): readonly Jump[] {
  let line = bookCache.get(board.id);
  if (!line) {
    const at = (r: number, c: number) => board.holes.findIndex((h) => h.row === r && h.col === c);
    line = BOOK[board.id].map(([fr, fc, tr, tc]) => {
      const jump = jumpBetween(board, at(fr, fc), at(tr, tc));
      if (!jump) throw new Error(`The ${board.id} book has a jump that isn't on the board`);
      return jump;
    });
    bookCache.set(board.id, line);
  }
  return line;
}

export function positionKey(board: Board, marbles: Marbles): string {
  return `${board.id}:${marbles.map((m) => (m ? 1 : 0)).join("")}`;
}

const known = new Map<string, Analysis>();
const MAX_KNOWN = 5000;

function remember(key: string, result: Analysis) {
  if (result.status === "unknown") return;
  if (known.size >= MAX_KNOWN) known.clear();
  known.set(key, result);
}

/**
 * Can one marble still be reached after these jumps? Free on the book line, and for
 * the position after one that was answered (following its answer keeps it solvable;
 * nothing after a hopeless position can be). Otherwise a search of up to `budget` steps.
 */
export function analyseMoves(boardId: BoardId, moves: readonly Move[], budget = DEFAULT_BUDGET, round = 0): Analysis {
  const board = BOARDS[boardId];
  const marbles = marblesAfter(board, moves);
  if (!marbles) return { status: "impossible" };
  if (marbleCount(marbles) === 1) return { status: "solvable", completion: [] };

  const line = bookLine(board);
  if (moves.every((m, i) => line[i] && line[i].from === m.from && line[i].to === m.to)) {
    return { status: "solvable", completion: line.slice(moves.length) };
  }

  const key = positionKey(board, marbles);
  const hit = known.get(key);
  if (hit) return hit;

  if (moves.length > 0) {
    const before = marblesAfter(board, moves.slice(0, -1));
    const parent = before ? known.get(positionKey(board, before)) : undefined;
    const last = moves[moves.length - 1];
    if (parent?.status === "impossible") return parent;
    if (parent?.status === "solvable" && parent.completion[0]?.from === last.from && parent.completion[0]?.to === last.to) {
      const result: Analysis = { status: "solvable", completion: parent.completion.slice(1) };
      remember(key, result);
      return result;
    }
  }

  const result = settle(board, marbles, "any", budget, round);
  remember(key, result);
  return result;
}

/** Only answers that are already known, without searching. */
export function knownAnalysis(boardId: BoardId, moves: readonly Move[]): Analysis {
  return analyseMoves(boardId, moves, 0);
}

/**
 * How many jumps to keep so one marble can be reached again: the latest earlier
 * position that surely can (an unknown one doesn't count, so the answer is always
 * safe). The mistake is nearly always a few jumps back, so it walks back one jump at a
 * time, where the searches are quick, giving up after `maxSteps` jumps. null: none found.
 */
export function lastGood(boardId: BoardId, moves: readonly Move[], maxSteps = 12, budget = DEFAULT_BUDGET): number | null {
  const walk = walkBack(boardId, moves, maxSteps, budget);
  for (;;) {
    const step = walk.next();
    if (step.done) return step.value;
  }
}

/**
 * lastGood() a slice at a time, so the page can draw in between (see
 * ui/use-analysis.ts): each earlier position gets `budget` steps, in slices of `slice`.
 */
export function* walkBack(
  boardId: BoardId,
  moves: readonly Move[],
  maxSteps = 12,
  budget = DEFAULT_BUDGET,
  slice = budget,
): Generator<void, number | null> {
  for (let k = moves.length - 1; k >= Math.max(0, moves.length - maxSteps); k--) {
    for (let used = 0, round = 0; used < budget; used += slice, round++) {
      const status = analyseMoves(boardId, moves.slice(0, k), Math.min(slice, budget - used), round).status;
      if (status === "solvable") return k;
      if (status === "impossible") break;
      yield;
    }
    yield;
  }
  return null;
}

/** The hint for a game: a jump that keeps one marble in reach, "back", or any legal jump. */
export function hintFor(boardId: BoardId, moves: readonly Move[], budget = DEFAULT_BUDGET): Hint | null {
  const board = BOARDS[boardId];
  const marbles = marblesAfter(board, moves);
  if (!marbles) return null;
  const legal = legalJumps(board, marbles);
  if (legal.length === 0) return null;
  const here = analyseMoves(boardId, moves, budget);
  if (here.status === "solvable") return { from: here.completion[0].from, to: here.completion[0].to };
  if (here.status === "impossible") return "back";
  // Too tangled to tell in time: any legal jump, and no claim that it's a good one.
  return { from: legal[0].from, to: legal[0].to };
}

/** What Watch it solve does next: a jump, a step back, or null when one marble is left. */
export type SolveStep = { type: "jump"; move: Move } | { type: "undo" } | null;

export function nextSolveStep(boardId: BoardId, moves: readonly Move[], round = 0): SolveStep {
  const board = BOARDS[boardId];
  const marbles = marblesAfter(board, moves);
  if (!marbles || marbleCount(marbles) === 1) return null;
  const here = analyseMoves(boardId, moves, DEFAULT_BUDGET, round);
  if (here.status === "solvable") return { type: "jump", move: { from: here.completion[0].from, to: here.completion[0].to } };
  // A dead end, or too tangled to tell quickly: step back and try from there. The start
  // is always on the book line, so this always ends.
  return moves.length > 0 ? { type: "undo" } : null;
}
