import { generate, isEndlessSize, type EndlessSize } from "./generator";
import { findPattern, PACKS, type PackId } from "./packs";
import type { Pattern } from "./pattern";
import { isValidTrace, penAt, Solver, type Trace } from "./solver";

/**
 * One drawing. Times are plain millisecond timestamps. The pattern is named rather
 * than stored: a hand-made one by its id, an Endless one by its size and seed, so a
 * saved drawing stays small and always matches its pattern.
 */
export type PatternRef = { kind: "pack"; id: string } | { kind: "endless"; size: EndlessSize; seed: number };

/** What Hint last showed, until the drawing moves on. */
export type Hint =
  /** Before the first line: the dots that can start it. */
  | { kind: "start"; dots: readonly number[] }
  /** The next line to draw. */
  | { kind: "line"; line: number }
  /** The rest can't be finished from here: step back (Undo pulses). */
  | { kind: "back" };

export type Game = {
  /** New for every fresh drawing, so anything tied to an old one can be told apart. */
  id: number;
  ref: PatternRef;
  start: number | null;
  /** Lines traced, in order. */
  lines: readonly number[];
  undos: number;
  hints: number;
  hint: Hint | null;
  /** Watch it solve drew a line, so this run doesn't count for best times. */
  assisted: boolean;
  startedAt: number | null;
  finishedAt: number | null;
};

/**
 * start: no line drawn yet (a start dot may be picked). drawing: under way and can
 * still be finished. stuck: the lines left can't all be drawn from here. done: every
 * line drawn.
 */
export type Phase = "start" | "drawing" | "stuck" | "done";

export type Action =
  /** Put the pen on a dot before the first line; picking another dot moves it. */
  | { type: "start"; dot: number }
  | { type: "trace"; line: number; now: number; auto?: boolean }
  /** Back to `to` lines drawn (default: one line back). Undoing past the first line lifts the pen. */
  | { type: "undo"; to?: number }
  | { type: "hint"; hint: Hint }
  | { type: "restart" };

export function newGame(ref: PatternRef, id = 0): Game {
  return { id, ref, start: null, lines: [], undos: 0, hints: 0, hint: null, assisted: false, startedAt: null, finishedAt: null };
}

// ---------- Patterns by name ----------

const made = new Map<string, Pattern>();

/** The pattern a ref names; null for a hand-made id this copy doesn't have. */
export function patternOf(ref: PatternRef): Pattern | null {
  if (ref.kind === "pack") return findPattern(ref.id)?.entry.pattern ?? null;
  const key = `${ref.size}:${ref.seed}`;
  let pattern = made.get(key);
  if (!pattern) {
    pattern = generate(ref.size, ref.seed);
    if (made.size >= 12) made.clear();
    made.set(key, pattern);
  }
  return pattern;
}

const solvers = new WeakMap<Pattern, Solver>();

export function solverOf(pattern: Pattern): Solver {
  let solver = solvers.get(pattern);
  if (!solver) {
    solver = new Solver(pattern);
    solvers.set(pattern, solver);
  }
  return solver;
}

export const traceOf = (game: Game): Trace => ({ start: game.start, lines: game.lines });

export function phaseOf(game: Game, pattern: Pattern): Phase {
  if (game.lines.length === 0) return "start";
  if (game.lines.length === pattern.lines.length) return "done";
  return solverOf(pattern).canFinish(traceOf(game)) ? "drawing" : "stuck";
}

/** A start dot that can't begin the pattern (it has two odd dots and this isn't one). */
export function wrongStart(game: Game, pattern: Pattern): boolean {
  return game.start !== null && game.lines.length === 0 && !solverOf(pattern).startDots().includes(game.start);
}

export function reduce(game: Game, action: Action, pattern: Pattern): Game {
  switch (action.type) {
    case "start": {
      const { dot } = action;
      if (game.lines.length > 0 || game.start === dot) return game;
      if (!Number.isInteger(dot) || dot < 0 || dot >= pattern.dots.length) return game;
      return { ...game, start: dot, hint: null };
    }
    case "trace": {
      const phase = phaseOf(game, pattern);
      if (phase === "done" || phase === "stuck" || game.start === null) return game;
      const lines = [...game.lines, action.line];
      if (!isValidTrace(pattern, { start: game.start, lines })) return game;
      const next: Game = {
        ...game,
        lines,
        hint: null,
        assisted: game.assisted || Boolean(action.auto),
        startedAt: game.startedAt ?? action.now,
      };
      const after = phaseOf(next, pattern);
      next.finishedAt = after === "done" || after === "stuck" ? action.now : null;
      return next;
    }
    case "undo": {
      const length = game.lines.length;
      if (length === 0) return game.start === null ? game : { ...game, start: null, hint: null };
      const to = Math.max(0, Math.min(action.to ?? length - 1, length - 1));
      return { ...game, lines: game.lines.slice(0, to), undos: game.undos + (length - to), hint: null, finishedAt: null };
    }
    case "hint":
      if (sameHint(game.hint, action.hint)) return game;
      return { ...game, hint: action.hint, hints: game.hints + 1 };
    case "restart":
      return newGame(game.ref, game.id + 1);
  }
}

function sameHint(a: Hint | null, b: Hint): boolean {
  if (!a || a.kind !== b.kind) return false;
  if (a.kind === "line" && b.kind === "line") return a.line === b.line;
  return true;
}

/** What Hint shows from here. */
export function hintFor(game: Game, pattern: Pattern): Hint {
  const solver = solverOf(pattern);
  if (game.lines.length === 0) {
    const dots = solver.startDots();
    // On a good start dot already: show the first line from it.
    if (game.start !== null && dots.includes(game.start)) {
      const line = solver.hint(traceOf(game));
      if (line !== null) return { kind: "line", line };
    }
    // Two odd dots: those. None: any dot works, so point at one.
    return { kind: "start", dots: dots.length === 2 ? dots : dots.slice(0, 1) };
  }
  const line = solver.hint(traceOf(game));
  return line === null ? { kind: "back" } : { kind: "line", line };
}

/** What Watch it solve does next: pick a start dot, draw a line, step back, or nothing when done. */
export type SolveStep = { type: "start"; dot: number } | { type: "trace"; line: number } | { type: "undo"; to: number } | null;

export function nextSolveStep(game: Game, pattern: Pattern): SolveStep {
  const solver = solverOf(pattern);
  if (game.lines.length === pattern.lines.length) return null;
  const starts = solver.startDots();
  if (game.lines.length === 0 && (game.start === null || !starts.includes(game.start))) {
    return { type: "start", dot: starts[0] };
  }
  const trace = traceOf(game);
  if (!solver.canFinish(trace)) return { type: "undo", to: Math.max(0, solver.lastGood(trace)) };
  const line = solver.hint(trace);
  return line === null ? null : { type: "trace", line };
}

/** Time on the clock: from the first line until the drawing ends (or now). */
export function elapsed(game: Game, now: number): number {
  if (game.startedAt === null) return 0;
  return Math.max(0, (game.finishedAt ?? now) - game.startedAt);
}

/** The dot the pen is on, or null before a start dot is picked. */
export function pen(game: Game, pattern: Pattern): number | null {
  return penAt(pattern, traceOf(game));
}

// ---------- Saved drawings ----------

/** A saved drawing, read defensively: anything that doesn't fit its pattern starts it afresh. */
export function parseGame(data: unknown): Game | null {
  if (!data || typeof data !== "object") return null;
  const raw = data as Record<string, unknown>;
  const ref = parseRef(raw.ref);
  if (!ref) return null;
  const pattern = patternOf(ref);
  if (!pattern) return null;
  const id = count(raw.id);
  const start = raw.start === null ? null : count(raw.start, -1);
  const lines = Array.isArray(raw.lines) && raw.lines.every((n) => Number.isInteger(n)) ? (raw.lines as number[]) : null;
  if (start === -1 || !lines || !isValidTrace(pattern, { start, lines })) return { ...newGame(ref, id) };
  const time = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null);
  const game: Game = {
    id,
    ref,
    start,
    lines,
    undos: count(raw.undos),
    hints: count(raw.hints),
    hint: null,
    assisted: raw.assisted === true,
    startedAt: lines.length ? time(raw.startedAt) : null,
    finishedAt: null,
  };
  const phase = phaseOf(game, pattern);
  game.finishedAt = phase === "done" || phase === "stuck" ? (time(raw.finishedAt) ?? game.startedAt) : null;
  return game;
}

export function parseRef(data: unknown): PatternRef | null {
  if (!data || typeof data !== "object") return null;
  const raw = data as Record<string, unknown>;
  if (raw.kind === "pack" && typeof raw.id === "string" && findPattern(raw.id)) return { kind: "pack", id: raw.id };
  if (raw.kind === "endless" && isEndlessSize(raw.size) && Number.isInteger(raw.seed) && (raw.seed as number) >= 0) {
    return { kind: "endless", size: raw.size, seed: raw.seed as number };
  }
  return null;
}

function count(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isInteger(v) && v >= 0 ? v : fallback;
}

/** "pack:diya" or "endless:small:1234": one string per pattern, for keys. */
export function refKey(ref: PatternRef): string {
  return ref.kind === "pack" ? `pack:${ref.id}` : `endless:${ref.size}:${ref.seed}`;
}

/** Where a hand-made pattern sits: its pack, its place and the one after it (null after the last of Hard). */
export function placeOf(id: string): { pack: PackId; index: number; total: number; next: string | null } | null {
  const found = findPattern(id);
  if (!found) return null;
  const all = PACKS.flatMap((pack) => pack.patterns.map((p) => p.id));
  const at = all.indexOf(id);
  const pack = PACKS.find((p) => p.id === found.pack)!;
  return { pack: found.pack, index: found.index, total: pack.patterns.length, next: all[at + 1] ?? null };
}
