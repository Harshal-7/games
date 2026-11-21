import { bounds, type Line, type Pattern, type Point } from "./pattern";

/**
 * A small kit for drawing patterns in code: dots by position (the same spot is the
 * same dot), lines and petals between them, rings of dots and arcs round a circle.
 * The hand-made packs are written with it, so each pattern is a few readable lines.
 */
export class Draw {
  private readonly points: Point[] = [];
  private readonly drawn: Line[] = [];

  /** The dot at (x, y), made if it isn't there yet. */
  dot(x: number, y: number): number {
    const rx = Math.round(x * 100) / 100;
    const ry = Math.round(y * 100) / 100;
    const found = this.points.findIndex(([px, py]) => Math.abs(px - rx) < 0.05 && Math.abs(py - ry) < 0.05);
    if (found >= 0) return found;
    this.points.push([rx, ry]);
    return this.points.length - 1;
  }

  /** A dot at an angle (degrees, 0 = right, 90 = down) and distance from a centre. */
  polar(r: number, degrees: number, cx = 0, cy = 0): number {
    const angle = (degrees * Math.PI) / 180;
    return this.dot(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
  }

  /** `n` dots round a circle, the first at `start` degrees (default: straight up), going clockwise. */
  ring(n: number, r: number, start = -90, cx = 0, cy = 0): number[] {
    return Array.from({ length: n }, (_, i) => this.polar(r, start + (360 * i) / n, cx, cy));
  }

  line(a: number, b: number, tone: number, bend = 0): this {
    this.drawn.push({ a, b, bend, tone });
    return this;
  }

  /** Straight lines through the dots in turn; `close` joins the last back to the first. */
  path(dots: readonly number[], tone: number, close = false, bend = 0): this {
    const n = dots.length;
    for (let i = 0; i + 1 < n + (close ? 1 : 0); i++) this.line(dots[i], dots[(i + 1) % n], tone, bend);
    return this;
  }

  /** A petal (two curves) between two dots. */
  petal(a: number, b: number, tone: number, bend = 0.3): this {
    return this.line(a, b, tone, bend).line(a, b, tone, -bend);
  }

  /**
   * The short arc from a to b round the circle centred at (cx, cy) through both.
   * Consecutive dots of a ring joined this way make the circle.
   */
  arc(a: number, b: number, tone: number, cx = 0, cy = 0): this {
    return this.line(a, b, tone, circleBend(this.points[a], this.points[b], [cx, cy]));
  }

  /** Arcs round a whole ring of dots (the circle through them). */
  circle(dots: readonly number[], tone: number, cx = 0, cy = 0): this {
    dots.forEach((dot, i) => this.arc(dot, dots[(i + 1) % dots.length], tone, cx, cy));
    return this;
  }

  /** The pattern drawn so far, moved and scaled to fill the -50 to 50 box. */
  done(): Pattern {
    return fit({ dots: this.points.slice(), lines: this.drawn.slice() });
  }
}

/** The bend that makes a→b the short arc of the circle round `centre`. */
export function circleBend(a: Point, b: Point, centre: Point): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const chord = Math.hypot(dx, dy);
  const r = Math.hypot(a[0] - centre[0], a[1] - centre[1]);
  const sagitta = r - Math.sqrt(Math.max(0, r * r - (chord * chord) / 4));
  // The arc bulges away from the centre: left of a→b when the centre is on the right.
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  const leftSide = dy * (centre[0] - mx) - dx * (centre[1] - my);
  return (leftSide > 0 ? -1 : 1) * (sagitta / chord);
}

/**
 * Centres a pattern in the -50 to 50 box and scales it so its longer side, curves
 * included, spans 100.
 */
export function fit(pattern: Pattern): Pattern {
  const { minX, minY, maxX, maxY } = bounds(pattern);
  const scale = 100 / Math.max(maxX - minX, maxY - minY, 1e-9);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const at = (v: number, c: number) => Math.round((v - c) * scale * 100) / 100;
  return {
    dots: pattern.dots.map(([x, y]) => [at(x, cx), at(y, cy)] as const),
    lines: pattern.lines,
  };
}
