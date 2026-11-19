import { knightMoves } from "./board";

/**
 * Can the tour still be finished from here? A depth-first search that tries the
 * square with the fewest onward moves first (Warnsdorff's rule), plus three quick
 * checks that prove a position hopeless long before the search would:
 *
 * 1. Colours: a knight always lands on the other colour, so the squares left must
 *    split between the two colours in exactly the right way. This is why a tour on
 *    5×5 or 7×7 can only start on the colour that has more squares.
 * 2. Dead ends: a square with one way in has to be the last square, so two of them
 *    means no tour, and so does one of the wrong colour for the last square. A
 *    square with no way in at all also means no tour.
 * 3. Islands: every square left must still be reachable from the knight, and no
 *    single square may split the rest into parts the route would need to revisit.
 *
 * The search stops after `budget` steps so it can never freeze the page. When that
 * happens the answer is "unknown".
 */

export type Analysis =
  | { status: "solvable"; completion: readonly number[] }
  | { status: "impossible" }
  | { status: "unknown" };

export const DEFAULT_BUDGET = 80_000;

const OUT_OF_BUDGET = Symbol("out of budget");

export function analyse(path: readonly number[], size: number, budget = DEFAULT_BUDGET): Analysis {
  const n = size * size;
  if (path.length === 0) return { status: "unknown" };
  if (path.length === n) return { status: "solvable", completion: [] };

  const finder = new RouteFinder(size);
  const found = finder.run(path, budget);
  if (found === null) return { status: "unknown" };
  return found ? { status: "solvable", completion: finder.route.slice() } : { status: "impossible" };
}

/** The search itself, for one position. */
class RouteFinder {
  readonly route: number[] = [];

  private readonly n: number;
  private readonly moves: readonly (readonly number[])[];
  private readonly colour: Uint8Array;
  private readonly visited: Uint8Array;
  /** Unvisited squares a jump away from each square. */
  private readonly degree: Uint8Array;
  /** Unvisited squares of each colour. */
  private readonly free = [0, 0];
  private readonly nearKnight: Int32Array;
  private readonly order: Int32Array;
  private readonly low: Int32Array;
  /** Among squares with equally few onward moves, try the ones nearest the edge first. */
  private readonly edgesFirst: Float64Array;
  private steps = 0;
  private limit = 0;
  private stamp = 0;
  private clock = 0;
  private roundStart = 0;
  private reachable = 0;
  private split = false;

  constructor(size: number) {
    this.n = size * size;
    this.moves = knightMoves(size);
    this.colour = Uint8Array.from({ length: this.n }, (_, sq) => (Math.floor(sq / size) + (sq % size)) & 1);
    this.visited = new Uint8Array(this.n);
    this.degree = new Uint8Array(this.n);
    this.nearKnight = new Int32Array(this.n);
    this.order = new Int32Array(this.n);
    this.low = new Int32Array(this.n);
    const mid = (size - 1) / 2;
    this.edgesFirst = Float64Array.from({ length: this.n }, (_, sq) => {
      const r = Math.floor(sq / size) - mid;
      const c = (sq % size) - mid;
      return -(r * r + c * c);
    });
  }

  /**
   * Looks for a route from the end of `path` over every square not in it.
   * true: found, in `route`. false: proved there is none. null: ran out of steps.
   */
  run(path: readonly number[], limit: number): boolean | null {
    const { n, moves, visited, degree, free, colour } = this;
    for (const sq of path) visited[sq] = 1;
    for (let s = 0; s < n; s++) {
      if (!visited[s]) free[colour[s]]++;
      for (const u of moves[s]) if (!visited[u]) degree[s]++;
    }
    this.limit = limit;
    try {
      return this.search(path[path.length - 1], free[0] + free[1]);
    } catch (error) {
      if (error === OUT_OF_BUDGET) return null;
      throw error;
    }
  }

  private search(knight: number, left: number): boolean {
    if (left === 0) return true;
    if (++this.steps > this.limit) throw OUT_OF_BUDGET;
    if (this.hopeless(knight, left)) return false;
    const { moves, visited, degree, edgesFirst } = this;
    const next = moves[knight].filter((u) => !visited[u]);
    next.sort((a, b) => degree[a] - degree[b] || edgesFirst[a] - edgesFirst[b]);
    for (const u of next) {
      this.visit(u);
      this.route.push(u);
      if (this.search(u, left - 1)) return true;
      this.route.pop();
      this.unvisit(u);
    }
    return false;
  }

  private visit(sq: number) {
    this.visited[sq] = 1;
    this.free[this.colour[sq]]--;
    for (const u of this.moves[sq]) this.degree[u]--;
  }

  private unvisit(sq: number) {
    this.visited[sq] = 0;
    this.free[this.colour[sq]]++;
    for (const u of this.moves[sq]) this.degree[u]++;
  }

  private hopeless(knight: number, left: number): boolean {
    const { n, moves, visited, degree, free, nearKnight } = this;

    // 1. Colours: the next square is the other colour, then they alternate.
    const c = this.colour[knight];
    if (free[1 - c] !== Math.ceil(left / 2) || free[c] !== Math.floor(left / 2)) return true;

    // 2. Dead ends. A square with one way in has to be the last square, and the last
    //    square's colour is fixed too: with an odd number of squares left it is the
    //    other colour from the knight's.
    const lastColour = left % 2 === 1 ? 1 - c : c;
    const stamp = ++this.stamp;
    for (const u of moves[knight]) nearKnight[u] = stamp;
    let ends = 0;
    for (let s = 0; s < n; s++) {
      if (visited[s]) continue;
      if (left > 1 && degree[s] === 0) return true;
      const waysIn = degree[s] + (nearKnight[s] === stamp ? 1 : 0);
      if (waysIn === 0) return true;
      if (waysIn === 1 && left > 1) {
        if (++ends > 1 || this.colour[s] !== lastColour) return true;
      }
    }

    // 3. Islands and squares that split the board.
    if (left > 2) {
      this.roundStart = this.clock;
      this.reachable = 0;
      this.split = false;
      this.walk(knight, -1, knight);
      if (this.split || this.reachable - 1 < left) return true;
    }
    return false;
  }

  /**
   * Depth-first walk over the squares left (plus the knight) that spots squares the
   * route would have to cross twice: if taking square v out leaves two or more groups
   * the knight can't reach without going through v, the route can't cover them all.
   * Also counts how many squares the knight can reach at all.
   */
  private walk(v: number, parent: number, knight: number) {
    const { moves, visited, order, low } = this;
    order[v] = low[v] = ++this.clock;
    this.reachable++;
    let cutOff = 0;
    let children = 0;
    for (const u of moves[v]) {
      if (u === parent || (visited[u] && u !== knight)) continue;
      if (order[u] > this.roundStart) {
        if (order[u] < low[v]) low[v] = order[u];
        continue;
      }
      children++;
      this.walk(u, v, knight);
      if (this.split) return;
      if (low[u] < low[v]) low[v] = low[u];
      if (v !== knight && low[u] >= order[v]) cutOff++;
    }
    // Around the knight itself, the squares left must hang together in one group.
    if ((v === knight && children > 1) || cutOff > 1) this.split = true;
  }
}

/** Plain Warnsdorff: the next square with the fewest onward moves. */
export function warnsdorffMove(path: readonly number[], size: number): number | null {
  if (path.length === 0) return null;
  const moves = knightMoves(size);
  const seen = new Set(path);
  let best: number | null = null;
  let bestDegree = Infinity;
  for (const u of moves[path[path.length - 1]]) {
    if (seen.has(u)) continue;
    const d = moves[u].filter((v) => !seen.has(v)).length;
    if (d < bestDegree) {
      best = u;
      bestDegree = d;
    }
  }
  return best;
}

const cache = new Map<string, Analysis>();
const MAX_CACHED = 4000;

/**
 * analyse(), remembered per position. A position right after a known one is free:
 * following the found route keeps it solvable, and nothing after a hopeless
 * position can be finished either.
 */
export function analyseCached(path: readonly number[], size: number): Analysis {
  if (path.length === 0) return { status: "unknown" };
  const key = `${size}:${path.join(",")}`;
  const hit = cache.get(key);
  if (hit && hit.status !== "unknown") return hit;

  // Checked even when this position is cached as "unknown": the step before may have
  // been solved since, and its route answers this one. (Watch it solve relies on it,
  // or it could step back and forth between the two forever.)
  let result: Analysis | undefined;
  if (path.length > 1) {
    const parent = cache.get(`${size}:${path.slice(0, -1).join(",")}`);
    if (parent?.status === "impossible") result = parent;
    else if (parent?.status === "solvable" && parent.completion[0] === path[path.length - 1]) {
      result = { status: "solvable", completion: parent.completion.slice(1) };
    }
  }
  result ??= hit ?? analyse(path, size);

  if (cache.size >= MAX_CACHED) cache.clear();
  cache.set(key, result);
  return result;
}

/**
 * How far back to undo so the tour can be finished again: the longest earlier
 * position that is surely solvable. 0 means even the starting square is hopeless.
 *
 * Positions only get worse as the path grows (anything after a hopeless position
 * is hopeless too), so a binary search finds the turning point in a few checks.
 * An "unknown" answer counts as not finishable, so the target is always safe.
 */
export function lastFinishable(path: readonly number[], size: number): number {
  let good = 0;
  let bad = path.length;
  while (bad - good > 1) {
    const mid = (good + bad) >> 1;
    if (analyseCached(path.slice(0, mid), size).status === "solvable") good = mid;
    else bad = mid;
  }
  return good;
}
