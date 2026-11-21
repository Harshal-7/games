import { otherEnd, samples, shapesOf, toSegment, type Pattern, type Point } from "./pattern";

/**
 * Following a finger along the lines. Everything is in the pattern's units (the box
 * is 100 across); the floor converts screen pixels before asking.
 *
 * A stroke is the finger's path since it left the pen's dot. Among the lines from
 * the pen not drawn yet, the one it follows is the one its path stays closest to, and
 * a line is drawn when the finger reaches its far dot. When two lines join the same
 * two dots (a petal), the path decides which: the one it stayed closest to all the way.
 */

/** How finely lines are sampled for following. */
const STEPS = 32;

export type Following = { line: number; t: number };

export class Tracks {
  readonly pattern: Pattern;
  private readonly paths: Point[][];

  constructor(pattern: Pattern) {
    this.pattern = pattern;
    this.paths = shapesOf(pattern).map((shape) => samples(shape, STEPS));
  }

  /** The nearest dot within `radius` of p, or null. */
  dotAt(p: Point, radius: number, only?: (dot: number) => boolean): number | null {
    let best: number | null = null;
    let bestD = radius;
    this.pattern.dots.forEach((dot, i) => {
      if (only && !only(i)) return;
      const d = Math.hypot(dot[0] - p[0], dot[1] - p[1]);
      if (d <= bestD) {
        best = i;
        bestD = d;
      }
    });
    return best;
  }

  /** How far p is from line i, and how far along it (0 to 1) measured from dot `from`. */
  project(line: number, from: number, p: Point): { d: number; t: number } {
    const path = this.paths[line];
    let best = { d: Infinity, t: 0 };
    for (let k = 0; k + 1 < path.length; k++) {
      const { d, t } = toSegment(p, path[k], path[k + 1]);
      if (d < best.d) best = { d, t: (k + t) / STEPS };
    }
    return this.pattern.lines[line].a === from ? best : { d: best.d, t: 1 - best.t };
  }

  /** The average distance from the stroke's points to line i. */
  closeness(line: number, from: number, stroke: readonly Point[]): number {
    if (stroke.length === 0) return 0;
    let sum = 0;
    for (const p of stroke) sum += this.project(line, from, p).d;
    return sum / stroke.length;
  }

  /**
   * Which of the open lines from the pen the stroke is following, and how far along
   * the finger is; null when the finger isn't near any of them.
   */
  following(pen: number, open: readonly number[], stroke: readonly Point[], tolerance: number): Following | null {
    const last = stroke[stroke.length - 1];
    if (!last) return null;
    let best: (Following & { score: number }) | null = null;
    for (const line of open) {
      const here = this.project(line, pen, last);
      if (here.d > tolerance) continue;
      const score = this.closeness(line, pen, stroke);
      if (!best || score < best.score - 1e-9 || (Math.abs(score - best.score) < 1e-9 && here.t > best.t)) {
        best = { line, t: here.t, score };
      }
    }
    return best && { line: best.line, t: best.t };
  }

  /**
   * The line the stroke has just finished: the finger is within `arrive` of the far
   * dot of an open line it stayed close to. Null if it hasn't arrived anywhere.
   */
  arrived(pen: number, open: readonly number[], stroke: readonly Point[], arrive: number, tolerance: number): number | null {
    const last = stroke[stroke.length - 1];
    if (!last) return null;
    let best: number | null = null;
    let bestScore = tolerance;
    for (const line of open) {
      const far = this.pattern.dots[otherEnd(this.pattern.lines[line], pen)];
      if (Math.hypot(far[0] - last[0], far[1] - last[1]) > arrive) continue;
      const score = this.closeness(line, pen, stroke);
      if (score <= bestScore) {
        best = line;
        bestScore = score;
      }
    }
    return best;
  }
}

/**
 * Fills in a fast swipe: points between two samples, at most `step` apart, so a
 * finger that jumps across a dot between two events still passes it.
 */
export function between(from: Point, to: Point, step: number): Point[] {
  const d = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const n = Math.max(1, Math.ceil(d / step));
  return Array.from({ length: n }, (_, i) => {
    const t = (i + 1) / n;
    return [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t] as const;
  });
}
