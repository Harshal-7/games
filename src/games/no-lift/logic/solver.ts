import { linesAt, oddDots, otherEnd, type Pattern } from "./pattern";

/**
 * Drawing a pattern in one line is finding an Euler path: a walk along every line
 * exactly once. Euler's rule settles it exactly, with no search:
 *
 * - the lines left must all hang together, and the pen must be on one of them;
 * - where an odd number of lines are left at a dot, the walk has to start or end
 *   there, so there may be none (the walk ends where it starts) or two, and then the
 *   pen must be on one of them.
 *
 * That check is quick (one pass over the lines), so Hint, Stuck and Watch it solve can
 * ask it as often as they like; unlike Knight's Tour, there is no "can't tell".
 *
 * Hint follows Fleury's rule: never take a line that would cut the rest of the
 * pattern off (a bridge) unless it's the only way on. In practice: of the lines at
 * the pen, take one after which the rest can still be finished.
 */

/** Where the drawing has got to: the dot it started on and the lines traced, in order. */
export type Trace = {
  readonly start: number | null;
  readonly lines: readonly number[];
};

/** The dots the drawing has passed through, from the start to where the pen is now. */
export function route(pattern: Pattern, trace: Trace): number[] {
  if (trace.start === null) return [];
  const dots = [trace.start];
  let at = trace.start;
  for (const i of trace.lines) {
    at = otherEnd(pattern.lines[i], at);
    dots.push(at);
  }
  return dots;
}

/** The dot the pen is on, or null before a start dot is picked. */
export function penAt(pattern: Pattern, trace: Trace): number | null {
  const dots = route(pattern, trace);
  return dots.length ? dots[dots.length - 1] : null;
}

/** Whether `lines` can follow on from the trace: each one touches the pen and isn't traced yet. */
export function isValidTrace(pattern: Pattern, trace: Trace): boolean {
  const { start, lines } = trace;
  if (start === null) return lines.length === 0;
  if (!Number.isInteger(start) || start < 0 || start >= pattern.dots.length) return false;
  const used = new Set<number>();
  let at = start;
  for (const i of lines) {
    const line = pattern.lines[i];
    if (!line || used.has(i) || (line.a !== at && line.b !== at)) return false;
    used.add(i);
    at = otherEnd(line, at);
  }
  return true;
}

/** A reusable checker for one pattern. */
export class Solver {
  readonly pattern: Pattern;
  private readonly at: readonly (readonly number[])[];
  private readonly used: Uint8Array;
  private readonly seen: Uint8Array;
  private readonly stack: number[] = [];

  constructor(pattern: Pattern) {
    this.pattern = pattern;
    this.at = linesAt(pattern);
    this.used = new Uint8Array(pattern.lines.length);
    this.seen = new Uint8Array(pattern.dots.length);
  }

  /** The dots a drawing may start on: the two odd dots if there are any, else every dot with a line. */
  startDots(): number[] {
    const odd = oddDots(this.pattern);
    if (odd.length > 0) return odd;
    return this.at.flatMap((touching, dot) => (touching.length > 0 ? [dot] : []));
  }

  /** Can every line left be traced in one go from the pen? A finished drawing can. */
  canFinish(trace: Trace): boolean {
    if (!isValidTrace(this.pattern, trace)) return false;
    if (trace.start === null) return true;
    this.mark(trace.lines);
    return this.finishable(penAt(this.pattern, trace)!, this.pattern.lines.length - trace.lines.length);
  }

  /**
   * The lines from the pen after which the rest can still be finished, best first:
   * the same colour as the last line before a new one (so Watch it solve draws a
   * petal or a ring at a time), then the pattern's own order. Empty when the drawing
   * is finished or stuck (or no start dot is picked yet).
   */
  safeLines(trace: Trace): number[] {
    if (trace.start === null || !this.canFinish(trace)) return [];
    const { lines } = this.pattern;
    const pen = penAt(this.pattern, trace)!;
    const left = lines.length - trace.lines.length;
    if (left === 0) return [];
    this.mark(trace.lines);
    const safe: number[] = [];
    for (const i of this.at[pen]) {
      if (this.used[i]) continue;
      this.used[i] = 1;
      if (this.finishable(otherEnd(lines[i], pen), left - 1)) safe.push(i);
      this.used[i] = 0;
    }
    const last = trace.lines.length ? lines[trace.lines[trace.lines.length - 1]] : null;
    const sameTone = (i: number) => (last && lines[i].tone === last.tone ? 0 : 1);
    return safe.sort((p, q) => sameTone(p) - sameTone(q) || p - q);
  }

  /** The next line to trace, by Fleury's rule; null when finished or stuck. */
  hint(trace: Trace): number | null {
    return this.safeLines(trace)[0] ?? null;
  }

  /** Every line left, in an order that finishes the pattern from here; null if it can't be. */
  finish(trace: Trace): number[] | null {
    if (trace.start === null || !this.canFinish(trace)) return null;
    const lines = [...trace.lines];
    const rest: number[] = [];
    while (lines.length < this.pattern.lines.length) {
      const next = this.hint({ start: trace.start, lines });
      if (next === null) return null; // Can't happen: Fleury's rule always finds a way on.
      lines.push(next);
      rest.push(next);
    }
    return rest;
  }

  /** A whole drawing from scratch: a start dot and every line in order. */
  solve(): Trace {
    const start = this.startDots()[0] ?? 0;
    return { start, lines: this.finish({ start, lines: [] }) ?? [] };
  }

  /**
   * How many lines to keep so the drawing can be finished again: the longest earlier
   * point that can. -1 when even the start dot can't work. Once a drawing can't be
   * finished, nothing after it can either, so this walks back to the turning point.
   */
  lastGood(trace: Trace): number {
    for (let keep = trace.lines.length; keep >= 0; keep--) {
      if (this.canFinish({ start: trace.start, lines: trace.lines.slice(0, keep) })) return keep;
    }
    return -1;
  }

  private mark(traced: readonly number[]) {
    this.used.fill(0);
    for (const i of traced) this.used[i] = 1;
  }

  /** Euler's rule on the lines not marked used, with the pen at `pen` and `left` lines to go. */
  private finishable(pen: number, left: number): boolean {
    if (left === 0) return true;
    const { at, used, seen, stack } = this;
    const { lines } = this.pattern;

    // Odd dots among the lines left: none, or two with the pen on one.
    let odd = 0;
    let penOdd = false;
    for (let dot = 0; dot < at.length; dot++) {
      let n = 0;
      for (const i of at[dot]) if (!used[i]) n++;
      if (n % 2 === 1) {
        odd++;
        if (dot === pen) penOdd = true;
      }
    }
    if (odd > 2 || (odd === 2 && !penOdd)) return false;

    // Every line left must be reachable from the pen.
    seen.fill(0);
    stack.length = 0;
    stack.push(pen);
    seen[pen] = 1;
    let reached = 0;
    while (stack.length) {
      const dot = stack.pop()!;
      for (const i of at[dot]) {
        if (used[i]) continue;
        reached++;
        const next = otherEnd(lines[i], dot);
        if (!seen[next]) {
          seen[next] = 1;
          stack.push(next);
        }
      }
    }
    // Each line left is counted once from each end.
    return reached === left * 2;
  }
}
