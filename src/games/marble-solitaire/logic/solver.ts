import { type Board, type BoardId, type Jump } from "./boards";
import { PAGODAS } from "./pagodas";

/**
 * Can this board still end with one marble (or one in the goal hole)? A depth-first
 * search on a bit-board that tries the jumps leaving the fewest lonely marbles first,
 * with three ways to give up on a position early:
 *
 * 1. Dead positions: every position the search has proved hopeless is remembered in
 *    its smallest form over the board's turns and flips, so a position and its mirror
 *    images are searched once between them. The memo lasts between searches, so later
 *    hints get quicker.
 * 2. The position class: three-colour the holes so every jump covers one of each
 *    colour. Each jump flips the parity of all three counts, so which parities match
 *    never changes, and the last marble can only end on a hole of the same class.
 * 3. Conway's pagoda functions: weights per hole that no jump can raise in total
 *    (./pagodas.ts). A total below every hole the last marble may end on proves it
 *    can't get there. Besides the stored ones, each target hole gets ψ^distance
 *    (ψ = 0.618…, so ψ² + ψ = 1), which catches marbles stranded far apart.
 *
 * The search stops after `budget` steps so it never freezes the page. Then the answer
 * is "unknown": Hint falls back to any legal jump and the stuck card stays quiet.
 */

/** "goal": end with one marble in the goal hole. "any": end with one marble anywhere. */
export type Target = "goal" | "any";

export type Analysis =
  | { status: "solvable"; completion: readonly Jump[] }
  | { status: "impossible" }
  | { status: "unknown" };

export const DEFAULT_BUDGET = 40_000;

/** A position: which holes have a marble. */
export type Marbles = readonly boolean[];

const OUT_OF_BUDGET = Symbol("out of budget");
const WORD = 4294967296;
const PSI = (Math.sqrt(5) - 1) / 2;
/** Room for rounding when comparing ψ totals with 1. */
const EPSILON = 1e-9;
/** Lonely marbles (no neighbour on any line) weigh this much more than spread when ordering. */
const LONELY = 100;
/** How far a seeded search may shuffle the scores: enough to swap close jumps, even lonely ones. */
const NOISE = 150;

/** A pagoda function with the total a position needs to still reach a target hole. */
type Pagoda = { weights: Float64Array; need: number };

/** Everything the search needs about one board and target, worked out once. */
type Tables = {
  board: Board;
  target: Target;
  n: number;
  /** Per jump: the two marbles it needs and the empty hole, as bits of the low and high words. */
  needLo: Int32Array;
  needHi: Int32Array;
  emptyLo: Int32Array;
  emptyHi: Int32Array;
  /** Per hole: its neighbours on the board's lines. */
  nearLo: Int32Array;
  nearHi: Int32Array;
  /** Per hole: how far it is from the middle of the board (or the goal hole). */
  spread: Int32Array;
  /** The symmetries the memo may use: those that keep the target holes where they are. */
  symmetries: readonly (readonly number[])[];
  /** Per jump and symmetry (jump * symmetries + s): the bits the jump flips in that mirror image. */
  flipLo: Int32Array;
  flipHi: Int32Array;
  /** The class every position of this board's game has, and the holes its last marble may end on. */
  cls: number;
  targets: readonly number[];
  pagodas: readonly Pagoda[];
};

const bitLo = (h: number) => (h < 32 ? 1 << h : 0);
const bitHi = (h: number) => (h < 32 ? 0 : 1 << (h - 32));

/** The position class: two bits per colouring, the count parities that never change. */
export function classOf(board: Board, has: (hole: number) => boolean): number {
  let cls = 0;
  for (const colours of board.colourings) {
    const count = [0, 0, 0];
    for (let h = 0; h < board.holes.length; h++) if (has(h)) count[colours[h]]++;
    cls = (cls << 2) | (((count[0] ^ count[1]) & 1) << 1) | ((count[1] ^ count[2]) & 1);
  }
  return cls;
}

/** Holes the last marble could end on, judging by the position class alone. */
export function possibleLastHoles(board: Board, marbles: Marbles): number[] {
  const cls = classOf(board, (h) => marbles[h]);
  return board.holes.map((_, h) => h).filter((h) => classOf(board, (i) => i === h) === cls);
}

/**
 * Steps between two holes along the board's lines, counting a step to any neighbour:
 * city-block distance on the square boards, hexagon distance on the triangle (whose
 * directions are (0,1), (1,0) and (1,1)).
 */
export function holeDistance(board: Board, a: number, b: number): number {
  const dr = board.holes[b].row - board.holes[a].row;
  const dc = board.holes[b].col - board.holes[a].col;
  if (board.id === "triangle" && dr * dc > 0) return Math.max(Math.abs(dr), Math.abs(dc));
  return Math.abs(dr) + Math.abs(dc);
}

/** A stored pagoda function's weights, hole by hole. */
export function pagodaWeights(board: Board, rows: readonly string[]): number[] {
  const grid = rows.map((row) => row.trim().split(/\s+/));
  return board.holes.map(({ row, col }) => Number(grid[row][col]));
}

const tablesCache = new Map<string, Tables>();

function tablesFor(board: Board, target: Target): Tables {
  const cacheKey = `${board.id}:${target}`;
  const cached = tablesCache.get(cacheKey);
  if (cached) return cached;

  const n = board.holes.length;
  const { jumps } = board;
  const m = jumps.length;

  const start = board.holes.map((_, h) => h !== board.start);
  const cls = classOf(board, (h) => start[h]);
  const targets = target === "goal" ? [board.goal] : possibleLastHoles(board, start);
  const symmetries = board.symmetries.filter((map) => {
    const moved = new Set(targets.map((t) => map[t]));
    return targets.every((t) => moved.has(t));
  });

  const needLo = new Int32Array(m);
  const needHi = new Int32Array(m);
  const emptyLo = new Int32Array(m);
  const emptyHi = new Int32Array(m);
  const nearLo = new Int32Array(n);
  const nearHi = new Int32Array(n);
  const s = symmetries.length;
  const flipLo = new Int32Array(m * s);
  const flipHi = new Int32Array(m * s);
  for (const [j, { from, over, to }] of jumps.entries()) {
    needLo[j] = bitLo(from) | bitLo(over);
    needHi[j] = bitHi(from) | bitHi(over);
    emptyLo[j] = bitLo(to);
    emptyHi[j] = bitHi(to);
    nearLo[from] |= bitLo(over);
    nearHi[from] |= bitHi(over);
    for (const [k, map] of symmetries.entries()) {
      for (const h of [from, over, to]) {
        flipLo[j * s + k] |= bitLo(map[h]);
        flipHi[j * s + k] |= bitHi(map[h]);
      }
    }
  }

  // Spread: twice the distance from the middle of the drawing (or from the goal hole).
  const midX = board.width / 2;
  const midY = board.height / 2;
  const spread = Int32Array.from(board.holes, ({ x, y }, h) =>
    target === "goal" ? 2 * holeDistance(board, h, board.goal) : Math.round(2 * (Math.abs(x - midX) + Math.abs(y - midY))),
  );

  // The stored pagoda functions and their mirror images, plus ψ^distance for each target.
  const pagodas: Pagoda[] = [];
  const seen = new Set<string>();
  for (const rows of PAGODAS[cacheKey as `${BoardId}:${Target}`] ?? []) {
    const weights = pagodaWeights(board, rows);
    for (const map of symmetries) {
      const image = new Float64Array(n);
      for (let h = 0; h < n; h++) image[map[h]] = weights[h];
      const key = image.join(",");
      if (seen.has(key)) continue;
      seen.add(key);
      pagodas.push({ weights: image, need: Math.min(...targets.map((t) => image[t])) });
    }
  }
  for (const t of targets) {
    const weights = Float64Array.from(board.holes, (_, h) => PSI ** holeDistance(board, t, h));
    // Each is checked on its own, so all of them must be short: see `hopeless`.
    pagodas.push({ weights, need: Number.NaN });
  }

  const tables: Tables = {
    board,
    target,
    n,
    needLo,
    needHi,
    emptyLo,
    emptyHi,
    nearLo,
    nearHi,
    spread,
    symmetries,
    flipLo,
    flipHi,
    cls,
    targets,
    pagodas,
  };
  tablesCache.set(cacheKey, tables);
  return tables;
}

/**
 * A set of positions as numbers (below 2^37), open addressing in one typed array so a
 * big memo stays small and quick. It starts over when it gets full.
 */
class PositionSet {
  private readonly keys: Float64Array;
  private used = 0;
  private readonly mask: number;
  private readonly shift: number;
  private readonly cap: number;

  constructor(bits: number) {
    this.keys = new Float64Array(1 << bits).fill(-1);
    this.mask = (1 << bits) - 1;
    this.shift = 32 - bits;
    this.cap = Math.floor((1 << bits) * 0.7);
  }

  private slot(key: number): number {
    const lo = key >>> 0;
    const hi = (key - lo) / WORD;
    return Math.imul(lo ^ Math.imul(hi, 0x27d4eb2d), 0x9e3779b1) >>> this.shift;
  }

  has(key: number): boolean {
    const { keys, mask } = this;
    for (let i = this.slot(key); ; i = (i + 1) & mask) {
      const k = keys[i];
      if (k === key) return true;
      if (k === -1) return false;
    }
  }

  add(key: number): void {
    if (this.used >= this.cap) {
      this.keys.fill(-1);
      this.used = 0;
    }
    const { keys, mask } = this;
    for (let i = this.slot(key); ; i = (i + 1) & mask) {
      const k = keys[i];
      if (k === key) return;
      if (k === -1) {
        keys[i] = key;
        this.used++;
        return;
      }
    }
  }
}

/** 2^20 slots, 8 MB per board and target in use: plenty for a game, fine for a phone. */
const MEMO_BITS = 20;
const deadMemo = new Map<string, PositionSet>();

function deadFor(board: Board, target: Target): PositionSet {
  const key = `${board.id}:${target}`;
  let dead = deadMemo.get(key);
  if (!dead) {
    dead = new PositionSet(MEMO_BITS);
    deadMemo.set(key, dead);
  }
  return dead;
}

/** Forgets every dead position (tests use it to time a search from scratch). */
export function forgetDeadPositions(): void {
  deadMemo.clear();
}

/** How many steps the last analyse() took (for tests). */
export let lastSteps = 0;

/**
 * One search of up to `budget` steps. A `seed` other than 0 shuffles jumps that score
 * about the same, so searches that start over (see ./analysis.ts) try other ways.
 */
export function analyse(
  board: Board,
  marbles: Marbles,
  target: Target = "any",
  budget = DEFAULT_BUDGET,
  seed = 0,
): Analysis {
  const finder = new Finder(tablesFor(board, target), seed);
  const found = finder.run(marbles, budget);
  lastSteps = finder.steps;
  if (found === null) return { status: "unknown" };
  return found ? { status: "solvable", completion: finder.route.map((j) => board.jumps[j]) } : { status: "impossible" };
}

/** The search for one position. */
class Finder {
  readonly route: number[] = [];
  steps = 0;

  private limit = 0;
  private goalLo = 0;
  private goalHi = 0;
  private readonly dead: PositionSet;
  /** The position as each symmetry sees it. */
  private readonly symLo: Int32Array;
  private readonly symHi: Int32Array;
  /** Every pagoda function's total for the position. */
  private readonly totals: Float64Array;
  /** Per depth: the legal jumps found and their scores, reused to save allocations. */
  private readonly jumpsAt: Int32Array[] = [];
  private readonly scoresAt: Float64Array[] = [];

  constructor(
    private readonly t: Tables,
    private seed: number,
  ) {
    this.dead = deadFor(t.board, t.target);
    this.symLo = new Int32Array(t.symmetries.length);
    this.symHi = new Int32Array(t.symmetries.length);
    this.totals = new Float64Array(t.pagodas.length);
  }

  /** true: found, in `route`. false: proved there is none. null: ran out of steps. */
  run(marbles: Marbles, limit: number): boolean | null {
    const { board, n, symmetries, pagodas, target } = this.t;
    let lo = 0;
    let hi = 0;
    let count = 0;
    for (let h = 0; h < n; h++) {
      if (!marbles[h]) continue;
      count++;
      lo |= bitLo(h);
      hi |= bitHi(h);
      for (const [i, map] of symmetries.entries()) {
        this.symLo[i] |= bitLo(map[h]);
        this.symHi[i] |= bitHi(map[h]);
      }
      for (const [f, { weights }] of pagodas.entries()) this.totals[f] += weights[h];
    }
    if (count === 0) return false;
    if (count === 1) return target === "any" || marbles[board.goal];
    // A position that can't come from this board's start: it can't end with one marble.
    if (classOf(board, (h) => marbles[h]) !== this.t.cls) return false;
    this.goalLo = bitLo(board.goal);
    this.goalHi = bitHi(board.goal);

    const m = board.jumps.length;
    for (let d = 0; d <= count; d++) {
      this.jumpsAt.push(new Int32Array(m));
      this.scoresAt.push(new Float64Array(m));
    }

    this.limit = limit;
    try {
      return this.search(lo, hi, count);
    } catch (error) {
      if (error === OUT_OF_BUDGET) return null;
      throw error;
    }
  }

  /** The position's smallest form over the symmetries: its key in the memo. */
  private canonical(): number {
    const { symLo, symHi } = this;
    let best = symHi[0] * WORD + (symLo[0] >>> 0);
    for (let i = 1; i < symLo.length; i++) {
      const key = symHi[i] * WORD + (symLo[i] >>> 0);
      if (key < best) best = key;
    }
    return best;
  }

  /** Plays (or takes back) jump j in the mirror images and the pagoda totals. */
  private apply(j: number, sign: 1 | -1) {
    const { flipLo, flipHi, symmetries, pagodas, board } = this.t;
    const s = symmetries.length;
    const base = j * s;
    for (let i = 0; i < s; i++) {
      this.symLo[i] ^= flipLo[base + i];
      this.symHi[i] ^= flipHi[base + i];
    }
    const { from, over, to } = board.jumps[j];
    for (let f = 0; f < pagodas.length; f++) {
      const w = pagodas[f].weights;
      this.totals[f] += sign * (w[to] - w[from] - w[over]);
    }
  }

  /** Whether a pagoda function proves the last marble can't end on a target hole. */
  private hopeless(): boolean {
    const { pagodas } = this.t;
    let psiShort = true;
    for (let f = 0; f < pagodas.length; f++) {
      const need = pagodas[f].need;
      if (Number.isNaN(need)) {
        if (this.totals[f] >= 1 - EPSILON) psiShort = false;
      } else if (this.totals[f] < need) {
        return true;
      }
    }
    return psiShort;
  }

  /** Lonely marbles (no neighbour to jump with) first, then how spread out they are. */
  private score(lo: number, hi: number): number {
    const { n, nearLo, nearHi, spread } = this.t;
    let lonely = 0;
    let far = 0;
    for (let h = 0; h < n; h++) {
      if (!(h < 32 ? (lo >>> h) & 1 : (hi >>> (h - 32)) & 1)) continue;
      if ((lo & nearLo[h]) === 0 && (hi & nearHi[h]) === 0) lonely++;
      far += spread[h];
    }
    if (this.seed === 0) return lonely * LONELY + far;
    this.seed = (Math.imul(this.seed, 1103515245) + 12345) | 0;
    return lonely * LONELY + far + (((this.seed >>> 8) & 1023) / 1024) * NOISE;
  }

  private search(lo: number, hi: number, count: number): boolean {
    if (count === 1) {
      return this.t.target === "any" || ((lo & this.goalLo) | (hi & this.goalHi)) !== 0;
    }
    const key = this.canonical();
    if (this.dead.has(key)) return false;
    if (++this.steps > this.limit) throw OUT_OF_BUDGET;
    if (this.hopeless()) {
      this.dead.add(key);
      return false;
    }

    // The legal jumps, best first.
    const { needLo, needHi, emptyLo, emptyHi } = this.t;
    const found = this.jumpsAt[count];
    const scores = this.scoresAt[count];
    let k = 0;
    for (let j = 0; j < needLo.length; j++) {
      const nl = needLo[j];
      const nh = needHi[j];
      const el = emptyLo[j];
      const eh = emptyHi[j];
      if ((lo & nl) !== nl || (hi & nh) !== nh || (lo & el) !== 0 || (hi & eh) !== 0) continue;
      const score = this.score(lo ^ (nl | el), hi ^ (nh | eh));
      // Insertion sort: there are rarely more than a dozen.
      let i = k++;
      while (i > 0 && scores[i - 1] > score) {
        scores[i] = scores[i - 1];
        found[i] = found[i - 1];
        i--;
      }
      scores[i] = score;
      found[i] = j;
    }

    for (let i = 0; i < k; i++) {
      const j = found[i];
      this.route.push(j);
      this.apply(j, 1);
      if (this.search(lo ^ (needLo[j] | emptyLo[j]), hi ^ (needHi[j] | emptyHi[j]), count - 1)) return true;
      this.apply(j, -1);
      this.route.pop();
    }
    this.dead.add(key);
    return false;
  }
}
