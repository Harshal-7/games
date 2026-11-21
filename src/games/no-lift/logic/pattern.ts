/**
 * A pattern: dots joined by lines, straight or curved. Coordinates sit in a box
 * from -50 to 50 each way, with y growing downwards like the screen, so the floor card
 * draws every pattern at the same scale.
 *
 * A curved line is a circular arc. Its `bend` says how far its middle sits off the
 * straight line between its dots, as a share of that line's length: 0.5 is a half
 * circle, and two lines between the same dots with bends 0.3 and -0.3 make a petal.
 */

export type Point = readonly [x: number, y: number];

export type Line = {
  readonly a: number;
  readonly b: number;
  /** 0 is straight. Positive bulges to the left of a→b as seen on screen, negative to the right. */
  readonly bend: number;
  /** Which powder colour it's traced in: an index into the palette. */
  readonly tone: number;
};

export type Pattern = {
  readonly dots: readonly Point[];
  readonly lines: readonly Line[];
};

/** How many powder colours there are (`--powder-0` to `--powder-5`). */
export const TONES = 6;

/** The far end of `line` from `dot`. */
export function otherEnd(line: Line, dot: number): number {
  return line.a === dot ? line.b : line.a;
}

/** How many lines meet at each dot. */
export function degrees(pattern: Pattern): number[] {
  const degree = pattern.dots.map(() => 0);
  for (const { a, b } of pattern.lines) {
    degree[a]++;
    degree[b]++;
  }
  return degree;
}

/** Dots where an odd number of lines meet. A pattern in one stroke has 0 or 2. */
export function oddDots(pattern: Pattern): number[] {
  return degrees(pattern).flatMap((d, i) => (d % 2 === 1 ? [i] : []));
}

/** For each dot, the lines that touch it. */
export function linesAt(pattern: Pattern): number[][] {
  const at: number[][] = pattern.dots.map(() => []);
  pattern.lines.forEach(({ a, b }, i) => {
    at[a].push(i);
    at[b].push(i);
  });
  return at;
}

/** Every line can be reached from every other one (dots with no lines don't count). */
export function isConnected(pattern: Pattern): boolean {
  const { lines } = pattern;
  if (lines.length === 0) return true;
  const at = linesAt(pattern);
  const seen = new Uint8Array(pattern.dots.length);
  const stack = [lines[0].a];
  seen[lines[0].a] = 1;
  while (stack.length) {
    const dot = stack.pop()!;
    for (const i of at[dot]) {
      const next = otherEnd(lines[i], dot);
      if (!seen[next]) {
        seen[next] = 1;
        stack.push(next);
      }
    }
  }
  return at.every((touching, dot) => touching.length === 0 || seen[dot] === 1);
}

// ---------- Geometry ----------

/** A line worked out once: where it runs, how long it is, and its SVG path. */
export type Shape = {
  readonly from: Point;
  readonly to: Point;
  readonly length: number;
  /** The point `t` of the way from a to b (0 to 1), evenly spaced along the line. */
  readonly at: (t: number) => Point;
  /** An arc's circle, for the SVG path; null for a straight line. */
  readonly arc: { readonly r: number; readonly large: boolean; readonly sweep: boolean } | null;
};

export function shapeOf(pattern: Pattern, line: Line): Shape {
  const from = pattern.dots[line.a];
  const to = pattern.dots[line.b];
  const [ax, ay] = from;
  const [bx, by] = to;
  const dx = bx - ax;
  const dy = by - ay;
  const chord = Math.hypot(dx, dy);
  if (line.bend === 0 || chord === 0) {
    return { from, to, length: chord, at: (t) => [ax + dx * t, ay + dy * t], arc: null };
  }
  // The middle of the arc sits `s` off the chord's midpoint, along the left-hand normal.
  const s = line.bend * chord;
  const nx = dy / chord;
  const ny = -dx / chord;
  const r = (chord * chord) / 4 / Math.abs(s) / 2 + Math.abs(s) / 2;
  const apexX = (ax + bx) / 2 + nx * s;
  const apexY = (ay + by) / 2 + ny * s;
  const cx = apexX - nx * Math.sign(s) * r;
  const cy = apexY - ny * Math.sign(s) * r;
  const start = Math.atan2(ay - cy, ax - cx);
  const sweepAngle = 4 * Math.atan(2 * Math.abs(line.bend));
  // Screen y grows downwards, so turning by +angle is clockwise: SVG's sweep flag 1.
  // Bulging left of a→b means going round the circle clockwise.
  const dir = s > 0 ? 1 : -1;
  return {
    from,
    to,
    length: r * sweepAngle,
    at: (t) => {
      if (t <= 0) return from;
      if (t >= 1) return to;
      const angle = start + dir * sweepAngle * t;
      return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
    },
    arc: { r, large: Math.abs(line.bend) > 0.5, sweep: dir === 1 },
  };
}

/** Every line's shape, in the pattern's order. */
export function shapesOf(pattern: Pattern): Shape[] {
  return pattern.lines.map((line) => shapeOf(pattern, line));
}

const round = (n: number) => Math.round(n * 100) / 100;

/** The SVG path of a line, drawn from `a` to `b`, or backwards from `b` to `a`. */
export function linePath(shape: Shape, backwards = false, move = true): string {
  const [from, to] = backwards ? [shape.to, shape.from] : [shape.from, shape.to];
  const head = move ? `M${round(from[0])} ${round(from[1])}` : "";
  if (!shape.arc) return `${head}L${round(to[0])} ${round(to[1])}`;
  const { r, large, sweep } = shape.arc;
  const flag = backwards ? !sweep : sweep;
  return `${head}A${round(r)} ${round(r)} 0 ${large ? 1 : 0} ${flag ? 1 : 0} ${round(to[0])} ${round(to[1])}`;
}

/** Points along a line, `steps` + 1 of them, from a to b. */
export function samples(shape: Shape, steps: number): Point[] {
  return Array.from({ length: steps + 1 }, (_, i) => shape.at(i / steps));
}

/** The box the whole pattern fits in, curves included. */
export function bounds(pattern: Pattern): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const take = ([x, y]: Point) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  };
  pattern.dots.forEach(take);
  for (const shape of shapesOf(pattern)) samples(shape, 24).forEach(take);
  return { minX, minY, maxX, maxY };
}

/** Distance from p to the segment a–b, and how far along it (0 to 1) the nearest point is. */
export function toSegment(p: Point, a: Point, b: Point): { d: number; t: number } {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2));
  return { d: Math.hypot(p[0] - (a[0] + dx * t), p[1] - (a[1] + dy * t)), t };
}

/**
 * Whether segments p1–p2 and q1–q2 cross or touch. Touching counts: two lines sampled
 * at the same steps often meet exactly at a sample point, like two diagonals of a
 * square at its middle.
 */
export function segmentsCross(p1: Point, p2: Point, q1: Point, q2: Point): boolean {
  const cross = (o: Point, a: Point, b: Point) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const d1 = cross(q1, q2, p1);
  const d2 = cross(q1, q2, p2);
  const d3 = cross(p1, p2, q1);
  const d4 = cross(p1, p2, q2);
  if (((d1 > EPS && d2 < -EPS) || (d1 < -EPS && d2 > EPS)) && ((d3 > EPS && d4 < -EPS) || (d3 < -EPS && d4 > EPS))) {
    return true;
  }
  const on = (a: Point, b: Point, p: Point) =>
    p[0] >= Math.min(a[0], b[0]) - EPS &&
    p[0] <= Math.max(a[0], b[0]) + EPS &&
    p[1] >= Math.min(a[1], b[1]) - EPS &&
    p[1] <= Math.max(a[1], b[1]) + EPS;
  return (
    (Math.abs(d1) <= EPS && on(q1, q2, p1)) ||
    (Math.abs(d2) <= EPS && on(q1, q2, p2)) ||
    (Math.abs(d3) <= EPS && on(p1, p2, q1)) ||
    (Math.abs(d4) <= EPS && on(p1, p2, q2))
  );
}

const EPS = 1e-6;
