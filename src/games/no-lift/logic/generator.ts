import { seeded, type Rng } from "@/party/logic/random";

import { angleGap, leavingAngle, MIN_ANGLE, problems } from "./check";
import { circleBend, fit } from "./draw";
import { isConnected, samples, segmentsCross, shapeOf, toSegment, type Pattern, type Point, type Shape } from "./pattern";

/**
 * Endless patterns: designs on a square grid of dots, mirrored four ways (left-right,
 * top-bottom and both diagonals).
 *
 * Every piece added is a closed loop (a petal, a ring round a dot, a square or a
 * diamond) and its mirror images. A loop adds two lines at each dot it passes, so
 * every dot stays even, and a pattern made of loops that hang together can always be
 * drawn in one line, ending where it started. Where a new loop would run over a line
 * that's already there, the two cancel out, which keeps every dot even too. Pieces
 * that would cross a line between dots are skipped, so the finished pattern fills in
 * cleanly. Each piece takes the next of the pattern's few colours.
 *
 * The same size and seed always give the same pattern, so a drawing in progress
 * survives a reload by saving just those two numbers.
 */

export type EndlessSize = "small" | "medium" | "large";

export const ENDLESS_SIZES: readonly EndlessSize[] = ["small", "medium", "large"];

export function isEndlessSize(value: unknown): value is EndlessSize {
  return value === "small" || value === "medium" || value === "large";
}

/** Dots from the middle to the edge, and how many lines a pattern of each size has. */
const SIZES: Record<EndlessSize, { half: number; min: number; max: number }> = {
  small: { half: 2, min: 16, max: 32 },
  medium: { half: 3, min: 32, max: 56 },
  large: { half: 4, min: 48, max: 88 },
};

/** Grid steps; (0, 0) is the middle dot. */
type Cell = readonly [x: number, y: number];

/** A loop as grid steps: corners in order, and the bend of each side (from that corner to the next). */
type Loop = { readonly corners: readonly Cell[]; readonly bends: readonly number[] };

type Side = { readonly a: Cell; readonly b: Cell; readonly bend: number };

/** The eight ways to turn or mirror the square; the last four flip it over. */
const SYMMETRIES: readonly ((c: Cell) => Cell)[] = [
  ([x, y]) => [x, y],
  ([x, y]) => [-y, x],
  ([x, y]) => [-x, -y],
  ([x, y]) => [y, -x],
  ([x, y]) => [-x, y],
  ([x, y]) => [x, -y],
  ([x, y]) => [y, x],
  ([x, y]) => [-y, -x],
];

const square = (x: number, y: number, bend: number): Loop => ({
  corners: [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]],
  bends: [bend, bend, bend, bend],
});
const RING_BEND = circleBend([0, -1], [1, 0], [0, 0]);

/** The pieces a pattern is made of, placed at grid step (x, y), and how often each is picked. */
const PIECES: readonly { weight: number; at: (x: number, y: number) => Loop }[] = [
  // A petal to the dot on the right, and one to the dot down-right.
  { weight: 4, at: (x, y) => ({ corners: [[x, y], [x + 1, y]], bends: [0.3, 0.3] }) },
  { weight: 3, at: (x, y) => ({ corners: [[x, y], [x + 1, y + 1]], bends: [0.26, 0.26] }) },
  // A square round the cell down-right of the dot: straight, bowed out like a
  // floor tile, or bowed in like a four-pointed star.
  { weight: 1, at: (x, y) => square(x, y, 0) },
  { weight: 2, at: (x, y) => square(x, y, 0.2) },
  { weight: 2, at: (x, y) => square(x, y, -0.2) },
  // A diamond round the dot, and a ring round it through its four neighbours.
  { weight: 1, at: (x, y) => ({ corners: [[x, y - 1], [x + 1, y], [x, y + 1], [x - 1, y]], bends: [0, 0, 0, 0] }) },
  {
    weight: 4,
    at: (x, y) => ({
      corners: [[x, y - 1], [x + 1, y], [x, y + 1], [x - 1, y]],
      bends: [RING_BEND, RING_BEND, RING_BEND, RING_BEND],
    }),
  },
];
const TOTAL_WEIGHT = PIECES.reduce((sum, piece) => sum + piece.weight, 0);

export function generate(size: EndlessSize, seed: number): Pattern {
  const { half, min, max } = SIZES[size];
  const rng = seeded(seed);
  // Some tries lead nowhere useful: try again from the same generator, so the
  // result still depends on the seed alone.
  for (let attempt = 0; attempt < 40; attempt++) {
    const pattern = new Builder(half, rng).build(min, max);
    if (pattern) return pattern;
  }
  return fallback(half);
}

/** One try at a pattern, with each line's points worked out once. */
class Builder {
  private readonly lines = new Map<string, Side & { tone: number }>();
  private readonly paths = new Map<string, { points: Point[]; box: Box; leaves: readonly [number, number] }>();
  private readonly spacing: number;
  private pieces = 0;

  constructor(
    private readonly half: number,
    private readonly rng: Rng,
  ) {
    this.spacing = 100 / (2 * half);
  }

  build(min: number, max: number): Pattern | null {
    const { rng, half } = this;
    const palette = pickTones(rng);
    for (let tries = 0; this.lines.size < min && tries < 600; tries++) {
      const piece = pickPiece(rng);
      const x = Math.floor(rng() * (half + 1));
      const y = Math.floor(rng() * (half + 1));
      const orbit = mirrored(piece.at(x, y), half);
      if (!orbit) continue;
      // After the first piece, each new one must touch the pattern, so it hangs together.
      if (this.lines.size > 0 && !orbit.some((side) => this.touches(side.a) || this.touches(side.b))) continue;
      // Each piece in the next of the pattern's colours.
      const tone = palette[this.pieces % palette.length];
      const added = orbit.filter((side) => !this.lines.has(keyOf(side)));
      const removed = orbit.length - added.length;
      const size = this.lines.size + added.length - removed;
      if (size > max || size <= this.lines.size) continue;
      if (!this.fits(added, orbit)) continue;
      for (const side of orbit) {
        const key = keyOf(side);
        if (this.lines.has(key)) this.lines.delete(key);
        else this.lines.set(key, { ...side, tone });
      }
      this.pieces++;
    }
    if (this.lines.size < min) return null;
    const pattern = toPattern([...this.lines.values()], this.spacing);
    if (!isConnected(pattern)) return null;
    // Scaled up to fill the floor when the outer dots went unused.
    const fitted = fit(pattern);
    return problems(fitted).length === 0 ? fitted : null;
  }

  private touches(cell: Cell): boolean {
    for (const { a, b } of this.lines.values()) if (same(a, cell) || same(b, cell)) return true;
    return false;
  }

  /**
   * The new lines cross nothing that stays, stay clear of every dot they don't end
   * at, and leave their dots in a different direction from the lines already there.
   */
  private fits(added: readonly Side[], orbit: readonly Side[]): boolean {
    const leaving = new Set(orbit.map(keyOf));
    const staying = [...this.lines.entries()].filter(([key]) => !leaving.has(key)).map(([, side]) => side);
    const after = [...staying, ...added];
    const dots = new Map<string, Cell>();
    for (const { a, b } of after) {
      dots.set(cellKey(a), a);
      dots.set(cellKey(b), b);
    }
    const clearance = this.spacing * 0.36;
    for (const side of added) {
      const mine = this.path(side);
      for (const other of after) {
        if (other === side) continue;
        const theirs = this.path(other);
        for (const [end, myAngle] of [
          [side.a, mine.leaves[0]],
          [side.b, mine.leaves[1]],
        ] as const) {
          const theirAngle = same(other.a, end) ? theirs.leaves[0] : same(other.b, end) ? theirs.leaves[1] : null;
          if (theirAngle !== null && angleGap(myAngle, theirAngle) < MIN_ANGLE + 2) return false;
        }
      }
      for (const dot of dots.values()) {
        if (same(dot, side.a) || same(dot, side.b)) continue;
        const point: Point = [dot[0] * this.spacing, dot[1] * this.spacing];
        if (!inBox(point, mine.box, clearance)) continue;
        if (nearest(point, mine.points) < clearance) return false;
      }
      for (const other of after) {
        if (other === side) continue;
        const theirs = this.path(other);
        if (!boxesMeet(mine.box, theirs.box)) continue;
        if (crosses(mine.points, theirs.points, side, other)) return false;
      }
    }
    return true;
  }

  private path(side: Side): { points: Point[]; box: Box; leaves: readonly [number, number] } {
    const key = keyOf(side);
    let found = this.paths.get(key);
    if (!found) {
      const { spacing } = this;
      const pattern: Pattern = {
        dots: [
          [side.a[0] * spacing, side.a[1] * spacing],
          [side.b[0] * spacing, side.b[1] * spacing],
        ],
        lines: [{ a: 0, b: 1, bend: side.bend, tone: 0 }],
      };
      const shape: Shape = shapeOf(pattern, pattern.lines[0]);
      const points = samples(shape, 16);
      found = { points, box: boxOf(points), leaves: [leavingAngle(shape, false), leavingAngle(shape, true)] };
      this.paths.set(key, found);
    }
    return found;
  }
}

function pickPiece(rng: Rng) {
  let r = rng() * TOTAL_WEIGHT;
  for (const piece of PIECES) {
    r -= piece.weight;
    if (r < 0) return piece;
  }
  return PIECES[PIECES.length - 1];
}

/** Two to four of the six powder colours, nearly always with pink. */
function pickTones(rng: Rng): number[] {
  const others = [1, 2, 3, 4, 5];
  for (let i = others.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [others[i], others[j]] = [others[j], others[i]];
  }
  const count = 2 + Math.floor(rng() * 3);
  const tones = rng() < 0.85 ? [0, ...others.slice(0, count - 1)] : others.slice(0, count);
  return rng() < 0.5 ? tones : tones.reverse();
}

/**
 * A loop and its mirror images, as the lines they add. Images that land on the same
 * loop count once; where two different images share a side, the side cancels out, as
 * it would drawing them one after the other. Null if any of it falls off the grid.
 */
function mirrored(loop: Loop, half: number): Side[] | null {
  const images = new Map<string, Side[]>();
  for (let s = 0; s < SYMMETRIES.length; s++) {
    const turn = SYMMETRIES[s];
    // Mirroring swaps left and right, so the bends swap sides too.
    const flip = s >= 4 ? -1 : 1;
    const corners = loop.corners.map(turn);
    if (corners.some(([x, y]) => Math.abs(x) > half || Math.abs(y) > half)) return null;
    const sides = corners.map((a, i) => ({ a, b: corners[(i + 1) % corners.length], bend: loop.bends[i] * flip }));
    images.set(sides.map(keyOf).sort().join(" "), sides);
  }
  const lines = new Map<string, Side>();
  for (const sides of images.values()) {
    for (const side of sides) {
      const key = keyOf(side);
      if (lines.has(key)) lines.delete(key);
      else lines.set(key, side);
    }
  }
  return [...lines.values()];
}

const cellKey = ([x, y]: Cell) => `${x},${y}`;
const same = (p: Cell, q: Cell) => p[0] === q[0] && p[1] === q[1];

/** The same line has the same key whichever end it's written from. */
function keyOf({ a, b, bend }: Side): string {
  const forwards = a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]);
  const [p, q, k] = forwards ? [a, b, bend] : [b, a, -bend];
  return `${cellKey(p)}>${cellKey(q)}:${Math.round(k * 1000)}`;
}

type Box = { minX: number; minY: number; maxX: number; maxY: number };

function boxOf(points: readonly Point[]): Box {
  const box = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const [x, y] of points) {
    box.minX = Math.min(box.minX, x);
    box.minY = Math.min(box.minY, y);
    box.maxX = Math.max(box.maxX, x);
    box.maxY = Math.max(box.maxY, y);
  }
  return box;
}

const boxesMeet = (p: Box, q: Box) => p.minX <= q.maxX && q.minX <= p.maxX && p.minY <= q.maxY && q.minY <= p.maxY;
const inBox = ([x, y]: Point, box: Box, pad: number) =>
  x >= box.minX - pad && x <= box.maxX + pad && y >= box.minY - pad && y <= box.maxY + pad;

function nearest(point: Point, path: readonly Point[]): number {
  let best = Infinity;
  for (let k = 0; k + 1 < path.length; k++) best = Math.min(best, toSegment(point, path[k], path[k + 1]).d);
  return best;
}

/** Whether two lines cross away from the dots they share. */
function crosses(p: readonly Point[], q: readonly Point[], sp: Side, sq: Side): boolean {
  const last = p.length - 2;
  for (let i = 0; i <= last; i++) {
    for (let j = 0; j <= last; j++) {
      const pDot = i === 0 ? sp.a : i === last ? sp.b : null;
      const qDot = j === 0 ? sq.a : j === last ? sq.b : null;
      if (pDot && qDot && same(pDot, qDot)) continue;
      if (segmentsCross(p[i], p[i + 1], q[j], q[j + 1])) return true;
    }
  }
  return false;
}

/** Dots numbered row by row (only the ones with lines), lines by colour. */
function toPattern(sides: readonly (Side & { tone: number })[], spacing: number): Pattern {
  const cells = new Map<string, Cell>();
  for (const { a, b } of sides) {
    cells.set(cellKey(a), a);
    cells.set(cellKey(b), b);
  }
  const ordered = [...cells.values()].sort((p, q) => p[1] - q[1] || p[0] - q[0]);
  const number = new Map(ordered.map((c, i) => [cellKey(c), i]));
  const lines = sides
    .map(({ a, b, bend, tone }) => ({ a: number.get(cellKey(a))!, b: number.get(cellKey(b))!, bend, tone }))
    .sort((p, q) => p.tone - q.tone || p.a - q.a || p.b - q.b || p.bend - q.bend);
  return { dots: ordered.map(([x, y]) => [x * spacing, y * spacing] as const), lines };
}

/** Never reached in practice (tests run many seeds): a ring round the middle dot. */
function fallback(half: number): Pattern {
  const ring = PIECES[PIECES.length - 1].at(0, 0);
  const sides = (mirrored(ring, half) ?? []).map((side) => ({ ...side, tone: 0 }));
  return fit(toPattern(sides, 100 / (2 * half)));
}
