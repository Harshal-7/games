import { apply, equals, frac, TARGET, type Frac, type Op, OPS } from "./frac";
import type { Top } from "./deal";
import { cardsOf, solve, textOfSteps, type Level, type Step } from "./solver";

/**
 * One hand on the table: four slots, each a card or empty once it's been merged away.
 * Tap a card, a sign, then another card: the result lands in the second card's slot.
 */
export type Hand = {
  numbers: number[];
  slots: (Frac | null)[];
  moves: Step[];
  picked: number | null;
  op: Op | null;
  hints: number;
  /** Show me was used: the answer is on the table and the hand counts as missed. */
  shown: boolean;
};

export type HandAction =
  | { type: "tap"; slot: number }
  | { type: "op"; op: Op }
  | { type: "undo" }
  | { type: "reset" }
  /** Hint: counts a hint. The screen rings the first step of `hintFor`. */
  | { type: "hint" }
  | { type: "show" };

export function newHand(numbers: readonly number[]): Hand {
  return { numbers: [...numbers], slots: numbers.map((n) => frac(n)), moves: [], picked: null, op: null, hints: 0, shown: false };
}

/** The cards still on the table. */
export function cardsLeft(hand: Hand) {
  return hand.slots.flatMap((value, slot) => (value ? [{ slot, value }] : []));
}

/** One card left: 24 or not. */
export function handState(hand: Hand): "playing" | "made" | "missed" | "wrong" {
  if (hand.shown) return "missed";
  const left = cardsLeft(hand);
  if (left.length > 1) return "playing";
  return equals(left[0].value, TARGET) ? "made" : "wrong";
}

/** Replays merges from the four starting cards. */
function replay(numbers: readonly number[], moves: readonly Step[]): (Frac | null)[] {
  const slots: (Frac | null)[] = numbers.map((n) => frac(n));
  for (const m of moves) {
    const a = slots[m.a];
    const b = slots[m.b];
    const r = a && b && apply(a, m.op, b);
    if (!r) break;
    slots[m.b] = r;
    slots[m.a] = null;
  }
  return slots;
}

/**
 * The first step to take from here. When the cards on the table can't make 24 any more,
 * the step starts from the four starting cards and `reset` says to bring them back.
 */
export function hintFor(hand: Hand): { step: Step; reset: boolean } | null {
  const now = solve(cardsLeft(hand));
  if (now.length) return { step: now[0].steps[0], reset: false };
  const fresh = solve(cardsOf(hand.numbers));
  return fresh.length ? { step: fresh[0].steps[0], reset: true } : null;
}

export function reduceHand(hand: Hand, action: HandAction): Hand {
  const state = handState(hand);
  if (state === "made" || state === "missed") return hand;
  switch (action.type) {
    case "tap": {
      const { slot } = action;
      if (!hand.slots[slot]) return hand;
      if (hand.picked === null) return { ...hand, picked: slot };
      if (hand.picked === slot) return { ...hand, picked: null, op: null };
      if (!hand.op) return { ...hand, picked: slot };
      const a = hand.slots[hand.picked]!;
      const result = apply(a, hand.op, hand.slots[slot]!);
      if (!result) return hand; // ÷ 0
      const slots = hand.slots.slice();
      slots[slot] = result;
      slots[hand.picked] = null;
      const moves = [...hand.moves, { a: hand.picked, op: hand.op, b: slot, result }];
      const next = { ...hand, slots, moves, op: null, picked: slot };
      return cardsLeft(next).length === 1 ? { ...next, picked: null } : next;
    }
    case "op":
      if (hand.picked === null || !OPS.includes(action.op)) return hand;
      return { ...hand, op: hand.op === action.op ? null : action.op };
    case "undo": {
      if (!hand.moves.length) return hand.picked === null && !hand.op ? hand : { ...hand, picked: null, op: null };
      const moves = hand.moves.slice(0, -1);
      return { ...hand, moves, slots: replay(hand.numbers, moves), picked: null, op: null };
    }
    case "reset":
      return hand.moves.length || hand.picked !== null ? { ...newHand(hand.numbers), hints: hand.hints } : hand;
    case "hint":
      return { ...hand, hints: hand.hints + 1 };
    case "show": {
      const [answer] = solve(cardsOf(hand.numbers));
      if (!answer) return hand;
      return { ...hand, moves: answer.steps, slots: replay(hand.numbers, answer.steps), picked: null, op: null, shown: true };
    }
  }
}

/** How a finished hand went, for the run's list. */
export type HandResult = { numbers: number[]; made: boolean; hints: number; text: string };

export function resultOf(hand: Hand): HandResult {
  return { numbers: hand.numbers, made: handState(hand) === "made", hints: hand.hints, text: textOfSteps(cardsOf(hand.numbers), hand.moves) };
}

/** A run: the daily five on one clock, or Practice, one hand after another. */
export type Run = {
  mode: "daily" | "practice";
  day: string | null;
  level: Level;
  top: Top;
  /** The daily's five hands; in Practice just the current one. */
  hands: number[][];
  hand: Hand;
  done: HandResult[];
  startedAt: number;
  /** When the current hand was dealt. */
  handAt: number;
  endedAt: number | null;
};

export type RunAction =
  | HandAction
  /** On to the next hand; Practice brings the newly dealt one. */
  | { type: "next"; now: number; deal?: number[] }
  /** Stamps the end when the last daily hand finishes. */
  | { type: "finish"; now: number };

export function newRun(mode: Run["mode"], hands: number[][], level: Level, top: Top, day: string | null, now: number): Run {
  return { mode, day, level, top, hands, hand: newHand(hands[0]), done: [], startedAt: now, handAt: now, endedAt: null };
}

/** The hand number in the run, from 1. */
export function handNumber(run: Run): number {
  return run.done.length + 1;
}

export function isOver(run: Run): boolean {
  return run.endedAt !== null;
}

export function reduceRun(run: Run, action: RunAction): Run {
  if (isOver(run)) return run;
  if (action.type === "next" || action.type === "finish") {
    const state = handState(run.hand);
    if (state !== "made" && state !== "missed") return run;
    const done = [...run.done, resultOf(run.hand)];
    if (run.mode === "daily") {
      if (done.length >= run.hands.length) return { ...run, done, endedAt: action.now };
      if (action.type === "finish") return run;
      return { ...run, done, hand: newHand(run.hands[done.length]), handAt: action.now };
    }
    if (action.type === "finish" || !action.deal) return run;
    return { ...run, done, hands: [action.deal], hand: newHand(action.deal), handAt: action.now };
  }
  const hand = reduceHand(run.hand, action);
  return hand === run.hand ? run : { ...run, hand };
}

/** Totals for a run: hands made, hints taken. */
export function tally(run: Run): { made: number; hints: number } {
  const all = isOver(run) ? run.done : [...run.done, resultOf(run.hand)];
  return { made: all.filter((h) => h.made).length, hints: all.reduce((n, h) => n + h.hints, 0) };
}

const isTime = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;
const isHand = (v: unknown): v is number[] =>
  Array.isArray(v) && v.length === 4 && v.every((n) => Number.isInteger(n) && n >= 1 && n <= 13);
const isCount = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0;

/** Reads a saved run. Moves are replayed from the numbers, so a broken save can't show wrong cards. */
export function parseRun(value: unknown): Run | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (v.mode !== "daily" && v.mode !== "practice") return null;
  if (v.level !== "easy" && v.level !== "medium" && v.level !== "hard") return null;
  const top: Top = v.top === 13 ? 13 : 9;
  const day = typeof v.day === "string" ? v.day : null;
  if (v.mode === "daily" && !day) return null;
  if (!Array.isArray(v.hands) || !v.hands.length || !v.hands.every(isHand)) return null;
  if (!Array.isArray(v.done) || !isTime(v.startedAt)) return null;
  const done: HandResult[] = [];
  for (const d of v.done as unknown[]) {
    const r = d as Partial<HandResult> | null;
    if (!r || !isHand(r.numbers) || typeof r.made !== "boolean" || !isCount(r.hints) || typeof r.text !== "string") return null;
    done.push({ numbers: r.numbers, made: r.made, hints: r.hints, text: r.text });
  }
  const h = v.hand as Partial<Hand> | null;
  if (!h || !isHand(h.numbers) || !Array.isArray(h.moves)) return null;
  // Replay the moves one at a time, so only merges that really happened come back.
  let hand = newHand(h.numbers);
  for (const m of h.moves as Partial<Step>[]) {
    if (!m || !isCount(m.a) || !isCount(m.b) || !OPS.includes(m.op as Op)) return null;
    const before = hand;
    hand = reduceHand(reduceHand(reduceHand({ ...hand, picked: null, op: null }, { type: "tap", slot: m.a }), { type: "op", op: m.op as Op }), { type: "tap", slot: m.b });
    if (hand.moves.length !== before.moves.length + 1) return null;
  }
  const shown = h.shown === true;
  hand = { ...hand, picked: null, op: null, hints: isCount(h.hints) ? h.hints : 0, shown };
  if (shown && !hand.moves.length) hand = reduceHand({ ...hand, shown: false }, { type: "show" });
  const run: Run = {
    mode: v.mode,
    day,
    level: v.level,
    top,
    hands: v.hands as number[][],
    hand,
    done,
    startedAt: v.startedAt,
    handAt: isTime(v.handAt) ? v.handAt : v.startedAt,
    endedAt: isTime(v.endedAt) ? v.endedAt : null,
  };
  return run;
}
