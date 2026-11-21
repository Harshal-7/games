import { apply, frac, isWhole, OPS, show, showOp, TARGET, equals, type Frac, type Op } from "./frac";

/**
 * Brute force over every order, pairing and sign: tiny for four numbers (about 9,000
 * ways), so no step budget is needed. Answers that are the same sum or product written
 * another way (a + b and b + a, (a + b) + c and a + (b + c), a − (b − c) and a − b + c)
 * count once.
 */

/** A card on the table: its value and the slot it sits in (0 to 3). */
export type Card = { slot: number; value: Frac };

type Node =
  | { kind: "card"; value: Frac; slot: number }
  | { kind: "op"; value: Frac; op: Op; left: Node; right: Node; slot: number };

/** One merge, as the player taps it: the card in slot `a`, the sign, then the card in slot `b`. */
export type Step = { a: number; op: Op; b: number; result: Frac };

export type Solution = {
  /** "8 ÷ (3 − 8 ÷ 3)". */
  text: string;
  /** The merges that make it, in order; each result lands in the second card's slot. */
  steps: Step[];
  /** Some value on the way isn't a whole number. */
  fraction: boolean;
  divisions: number;
};

const PREC: Record<Op, number> = { "+": 1, "-": 1, "×": 2, "÷": 2 };

function text(node: Node, parent: Op | null = null, right = false): string {
  if (node.kind === "card") return isWhole(node.value) || !parent ? show(node.value) : `(${show(node.value)})`;
  const inner = `${text(node.left, node.op, false)} ${showOp(node.op)} ${text(node.right, node.op, true)}`;
  if (!parent) return inner;
  const p = PREC[parent];
  const c = PREC[node.op];
  const wrap = c < p || (c === p && right && (parent === "-" || parent === "÷"));
  return wrap ? `(${inner})` : inner;
}

/**
 * A key that's the same for answers that only differ by order or grouping: sums become a
 * sorted list of signed terms, products a sorted list of factors and divisors.
 */
function key(node: Node): string {
  if (node.kind === "card") return show(node.value);
  const additive = node.op === "+" || node.op === "-";
  const parts: string[] = [];
  const collect = (n: Node, flip: boolean) => {
    if (n.kind === "op" && (n.op === "+" || n.op === "-") === additive) {
      collect(n.left, flip);
      collect(n.right, n.op === "-" || n.op === "÷" ? !flip : flip);
    } else {
      parts.push((flip ? (additive ? "-" : "/") : additive ? "+" : "*") + key(n));
    }
  };
  collect(node, false);
  return `${additive ? "S" : "P"}(${parts.sort().join(",")})`;
}

function steps(node: Node, out: Step[] = []): Step[] {
  if (node.kind === "op") {
    steps(node.left, out);
    steps(node.right, out);
    out.push({ a: node.left.slot, op: node.op, b: node.right.slot, result: node.value });
  }
  return out;
}

function walk(node: Node, f: (n: Node) => void) {
  f(node);
  if (node.kind === "op") {
    walk(node.left, f);
    walk(node.right, f);
  }
}

function describe(node: Node): Solution {
  let fraction = false;
  let divisions = 0;
  walk(node, (n) => {
    if (!isWhole(n.value)) fraction = true;
    if (n.kind === "op" && n.op === "÷") divisions++;
  });
  return { text: text(node), steps: steps(node), fraction, divisions };
}

/** Plainer answers first: no fractions, fewer divisions, then shorter. */
function plainer(a: Solution, b: Solution): number {
  return Number(a.fraction) - Number(b.fraction) || a.divisions - b.divisions || a.text.length - b.text.length || (a.text < b.text ? -1 : a.text > b.text ? 1 : 0);
}

/** Every different way to make `target` from the cards, plainest first. */
export function solve(cards: readonly Card[], target: Frac = TARGET): Solution[] {
  const found = new Map<string, Solution>();
  const go = (nodes: Node[]) => {
    if (nodes.length === 1) {
      const [only] = nodes;
      if (!equals(only.value, target)) return;
      const k = key(only);
      const s = describe(only);
      const had = found.get(k);
      if (!had || plainer(s, had) < 0) found.set(k, s);
      return;
    }
    for (let i = 0; i < nodes.length; i++) {
      for (let j = 0; j < nodes.length; j++) {
        if (i === j) continue;
        const rest = nodes.filter((_, k) => k !== i && k !== j);
        for (const op of OPS) {
          // a + b and a × b come round again as b + a and b × a; one is enough.
          if ((op === "+" || op === "×") && j < i) continue;
          const value = apply(nodes[i].value, op, nodes[j].value);
          if (!value) continue;
          go([...rest, { kind: "op", value, op, left: nodes[i], right: nodes[j], slot: nodes[j].slot }]);
        }
      }
    }
  };
  go(cards.map((c) => ({ kind: "card", value: c.value, slot: c.slot })));
  return [...found.values()].sort(plainer);
}

/** The four numbers as cards in slots 0 to 3. */
export function cardsOf(numbers: readonly number[]): Card[] {
  return numbers.map((n, slot) => ({ slot, value: frac(n) }));
}

export type Level = "easy" | "medium" | "hard";

/** At most this many answers is Hard. */
export const HARD_MAX = 1;
/** At least this many answers (one without division) is Easy. */
export const EASY_MIN = 4;

export type Rating = { solutions: number; fraction: boolean; division: boolean; level: Level } | null;

/**
 * How hard a hand is, from its answers: Hard when every answer needs a fraction or there's
 * only one; Easy when there are several and one of them needs no division; Medium between.
 * Null when it can't be made. Of the 404 hands of 1 to 9 that can be made, that's 150 Easy,
 * 159 Medium and 95 Hard.
 */
export function rate(numbers: readonly number[]): Rating {
  const all = solve(cardsOf(numbers));
  if (!all.length) return null;
  const fraction = all.every((s) => s.fraction);
  const division = all.every((s) => s.divisions > 0);
  const n = all.length;
  const level: Level = fraction || n <= HARD_MAX ? "hard" : n >= EASY_MIN && !division ? "easy" : "medium";
  return { solutions: n, fraction, division, level };
}

/**
 * The player's own merges written out ("(5 + 2 − 3) × 6"), for the day's list. Merges
 * that don't fit the cards are skipped.
 */
export function textOfSteps(cards: readonly Card[], moves: readonly Step[]): string {
  const at = new Map<number, Node>(cards.map((c) => [c.slot, { kind: "card", value: c.value, slot: c.slot }]));
  for (const m of moves) {
    const left = at.get(m.a);
    const right = at.get(m.b);
    const value = left && right && apply(left.value, m.op, right.value);
    if (!left || !right || !value) continue;
    at.delete(m.a);
    at.set(m.b, { kind: "op", value, op: m.op, left, right, slot: m.b });
  }
  return [...at.values()].map((n) => text(n)).join(", ");
}
