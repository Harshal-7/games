import { linePath, samples, shapesOf, type Pattern, type Point, type Shape } from "./pattern";

/**
 * The closed shapes between the lines (petals, diamonds, the inside of a diya), which
 * fill with colour when a pattern is finished. Patterns never cross a line without a
 * dot there, so the lines split the floor into faces, and walking round each face
 * turns the same way at every dot.
 */
export type Face = {
  /** SVG path round the face. */
  readonly path: string;
  /** The powder colour most of its edge is traced in. */
  readonly tone: number;
};

/** Each line as two half-edges: 2i runs a→b, 2i + 1 runs b→a. */
const lineOf = (half: number) => half >> 1;
const twin = (half: number) => half ^ 1;

export function facesOf(pattern: Pattern): Face[] {
  const { dots, lines } = pattern;
  const shapes = shapesOf(pattern);

  // Around each dot, the half-edges leaving it, in order of the way they leave. The
  // direction is taken a little way along each line, so two curves leaving along the
  // same tangent (a petal's two sides meeting a straight line) still sort apart.
  const out: number[][] = dots.map(() => []);
  const angle = new Float64Array(lines.length * 2);
  lines.forEach((line, i) => {
    const shape = shapes[i];
    const step = Math.min(0.2, 2 / Math.max(shape.length, 1e-9));
    angle[2 * i] = heading(dots[line.a], shape.at(step));
    angle[2 * i + 1] = heading(dots[line.b], shape.at(1 - step));
    out[line.a].push(2 * i);
    out[line.b].push(2 * i + 1);
  });
  const slot = new Int32Array(lines.length * 2);
  for (const around of out) {
    around.sort((p, q) => angle[p] - angle[q]);
    around.forEach((half, k) => (slot[half] = k));
  }

  const tail = (half: number) => (half & 1 ? lines[lineOf(half)].b : lines[lineOf(half)].a);
  const head = (half: number) => tail(twin(half));
  // Arriving at a dot along `half`, carry on along the next line clockwise from the
  // one we came in on: that keeps the face on the same side all the way round.
  const next = (half: number) => {
    const back = twin(half);
    const around = out[head(half)];
    return around[(slot[back] + around.length - 1) % around.length];
  };

  const faces: { halves: number[]; area: number }[] = [];
  const done = new Uint8Array(lines.length * 2);
  for (let first = 0; first < lines.length * 2; first++) {
    if (done[first]) continue;
    const halves: number[] = [];
    for (let half = first; !done[half]; half = next(half)) {
      done[half] = 1;
      halves.push(half);
    }
    faces.push({ halves, area: areaOf(halves, shapes) });
  }

  // The outside of the pattern runs round the other way from every face inside it.
  const inside = faces.filter((face) => face.area > 1e-6);
  return inside.map(({ halves }) => ({
    path: halves.map((half, k) => linePath(shapes[lineOf(half)], (half & 1) === 1, k === 0)).join("") + "Z",
    tone: commonest(halves.map((half) => lines[lineOf(half)].tone)),
  }));
}

/** How many faces a connected pattern has, the outside included: Euler's formula. */
export function expectedFaces(pattern: Pattern): number {
  const used = new Set(pattern.lines.flatMap(({ a, b }) => [a, b]));
  return pattern.lines.length - used.size + 2;
}

function heading(from: Point, to: Point): number {
  return Math.atan2(to[1] - from[1], to[0] - from[0]);
}

/** Signed area round a face, from points along its lines: positive runs clockwise on screen. */
function areaOf(halves: readonly number[], shapes: readonly Shape[]): number {
  let sum = 0;
  for (const half of halves) {
    const points = samples(shapes[lineOf(half)], 16);
    if (half & 1) points.reverse();
    for (let k = 0; k + 1 < points.length; k++) {
      sum += points[k][0] * points[k + 1][1] - points[k + 1][0] * points[k][1];
    }
  }
  return sum / 2;
}

/** The tone used most; ties go to the lower number, so mirrored faces match. */
function commonest(tones: readonly number[]): number {
  const counts = new Map<number, number>();
  for (const tone of tones) counts.set(tone, (counts.get(tone) ?? 0) + 1);
  let best = tones[0] ?? 0;
  for (const [tone, n] of counts) {
    const bestCount = counts.get(best) ?? 0;
    if (n > bestCount || (n === bestCount && tone < best)) best = tone;
  }
  return best;
}
