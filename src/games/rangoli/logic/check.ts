import {
  isConnected,
  oddDots,
  samples,
  segmentsCross,
  shapesOf,
  toSegment,
  type Pattern,
  type Point,
  type Shape,
} from "./pattern";

/**
 * What a pattern must be for a finger to draw it in one line, and for the floor to
 * fill its shapes at the end. Tests run every hand-made pattern and many Endless ones
 * through this; an empty list means it's fine.
 */

/** Dots at least this far apart (the box is 100 across, about 3 screen px a unit on a phone). */
export const MIN_DOT_GAP = 9;
/** Lines keep this far from dots they don't end at, so the finger doesn't land on them by mistake. */
export const MIN_CLEARANCE = 4.5;
/** Lines leaving the same dot at least this many degrees apart, so the finger can tell them apart. */
export const MIN_ANGLE = 12;

const STEPS = 48;

export function problems(pattern: Pattern): string[] {
  const { dots, lines } = pattern;
  const found: string[] = [];
  const shapes = shapesOf(pattern);

  if (lines.length === 0) found.push("no lines");
  if (!isConnected(pattern)) found.push("not connected");
  const odd = oddDots(pattern);
  if (odd.length !== 0 && odd.length !== 2) found.push(`${odd.length} odd dots`);

  const used = new Set<number>();
  const seen = new Set<string>();
  lines.forEach(({ a, b, bend, tone }, i) => {
    if (a === b) found.push(`line ${i} starts and ends at the same dot`);
    if (!dots[a] || !dots[b]) found.push(`line ${i} has a missing dot`);
    if (!Number.isInteger(tone) || tone < 0 || tone > 5) found.push(`line ${i} has no tone`);
    if (Math.abs(bend) >= 0.95) found.push(`line ${i} bends too far`);
    used.add(a);
    used.add(b);
    const key = a < b ? `${a}-${b}:${round(bend)}` : `${b}-${a}:${round(-bend)}`;
    if (seen.has(key)) found.push(`line ${i} is drawn twice`);
    seen.add(key);
  });
  dots.forEach(([x, y], i) => {
    if (!used.has(i)) found.push(`dot ${i} has no line`);
    if (Math.abs(x) > 50.01 || Math.abs(y) > 50.01) found.push(`dot ${i} is outside the box`);
    for (let j = 0; j < i; j++) {
      if (Math.hypot(x - dots[j][0], y - dots[j][1]) < MIN_DOT_GAP) found.push(`dots ${j} and ${i} are too close`);
    }
  });
  if (found.length) return found;

  const paths = shapes.map((shape) => samples(shape, STEPS));
  const boxes = paths.map(boxOf);

  // Lines stay clear of the dots they don't end at.
  lines.forEach(({ a, b }, i) => {
    dots.forEach((dot, k) => {
      if (k === a || k === b || !near(boxes[i], dot, MIN_CLEARANCE)) return;
      if (distanceTo(dot, paths[i]) < MIN_CLEARANCE) found.push(`line ${i} runs over dot ${k}`);
    });
  });

  // Lines leaving the same dot go different ways.
  const leaving: { dot: number; angle: number; line: number }[] = [];
  lines.forEach(({ a, b }, i) => {
    leaving.push({ dot: a, angle: leavingAngle(shapes[i], false), line: i });
    leaving.push({ dot: b, angle: leavingAngle(shapes[i], true), line: i });
  });
  for (let p = 0; p < leaving.length; p++) {
    for (let q = p + 1; q < leaving.length; q++) {
      if (leaving[p].dot !== leaving[q].dot || leaving[p].line === leaving[q].line) continue;
      if (angleGap(leaving[p].angle, leaving[q].angle) < MIN_ANGLE) found.push(`lines ${leaving[p].line} and ${leaving[q].line} leave dot ${leaving[p].dot} together`);
    }
  }

  // No two lines cross, except where they meet at a dot.
  for (let i = 0; i < lines.length; i++) {
    for (let j = i + 1; j < lines.length; j++) {
      if (!overlap(boxes[i], boxes[j])) continue;
      if (crosses(paths[i], paths[j], lines[i], lines[j])) found.push(`lines ${i} and ${j} cross`);
    }
  }
  return found;
}

type Box = readonly [minX: number, minY: number, maxX: number, maxY: number];

function boxOf(points: readonly Point[]): Box {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

const overlap = (p: Box, q: Box) => p[0] <= q[2] && q[0] <= p[2] && p[1] <= q[3] && q[1] <= p[3];
const near = (box: Box, [x, y]: Point, pad: number) =>
  x >= box[0] - pad && x <= box[2] + pad && y >= box[1] - pad && y <= box[3] + pad;

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/** Which way a line leaves its dot, in degrees: towards a point a tenth of the way along. */
export function leavingAngle(shape: Shape, fromEnd: boolean): number {
  const [from, to] = fromEnd ? [shape.to, shape.at(0.9)] : [shape.from, shape.at(0.1)];
  return (Math.atan2(to[1] - from[1], to[0] - from[0]) * 180) / Math.PI;
}

/** The gap between two directions in degrees, 0 to 180. */
export function angleGap(p: number, q: number): number {
  const gap = Math.abs(p - q) % 360;
  return Math.min(gap, 360 - gap);
}

function distanceTo(point: Point, path: readonly Point[]): number {
  let best = Infinity;
  for (let k = 0; k + 1 < path.length; k++) best = Math.min(best, toSegment(point, path[k], path[k + 1]).d);
  return best;
}

/** Whether two sampled lines cross away from the dots they share. */
function crosses(
  p: readonly Point[],
  q: readonly Point[],
  lp: { a: number; b: number },
  lq: { a: number; b: number },
): boolean {
  const last = STEPS - 1;
  for (let i = 0; i <= last; i++) {
    for (let j = 0; j <= last; j++) {
      // Segments that both touch a dot the two lines share meet there, which is fine.
      const pDot = i === 0 ? lp.a : i === last ? lp.b : -1;
      const qDot = j === 0 ? lq.a : j === last ? lq.b : -1;
      if (pDot >= 0 && pDot === qDot) continue;
      if (segmentsCross(p[i], p[i + 1], q[j], q[j + 1])) return true;
    }
  }
  return false;
}
