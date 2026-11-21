import { describe, expect, it } from "vitest";

import { seeded } from "@/party/logic/random";

import { Draw } from "./draw";
import { EASY } from "./packs/easy";
import { otherEnd, type Pattern } from "./pattern";
import { isValidTrace, penAt, route, Solver, type Trace } from "./solver";

/** A square with one diagonal: two odd dots, at the ends of the diagonal. */
function envelope(): Pattern {
  const d = new Draw();
  const [a, b, c, e] = [d.dot(0, 0), d.dot(10, 0), d.dot(10, 10), d.dot(0, 10)];
  d.path([a, b, c, e], 0, true).line(a, c, 1);
  return d.done();
}

/** Two petals joined by a stalk: the stalk is a bridge. */
function twoFlowers(): Pattern {
  const d = new Draw();
  const [a, b, c, e] = [d.dot(0, 0), d.dot(10, 0), d.dot(20, 0), d.dot(30, 0)];
  d.petal(a, b, 0).line(b, c, 1).petal(c, e, 0);
  return d.done();
}

/** The envelope with a petal hanging off its top right corner (lines 5 and 6). */
function envelopeWithPetal(): Pattern {
  const d = new Draw();
  const [a, b, c, e] = [d.dot(0, 0), d.dot(10, 0), d.dot(10, 10), d.dot(0, 10)];
  d.path([a, b, c, e], 0, true).line(a, c, 1).petal(b, d.dot(20, -10), 2);
  return d.done();
}

/** Brute force: is there any way to trace every line left, from the pen? */
function reallyFinishable(pattern: Pattern, trace: Trace): boolean {
  if (trace.start === null) return true;
  const used = new Set(trace.lines);
  const walk = (at: number, left: number): boolean => {
    if (left === 0) return true;
    for (let i = 0; i < pattern.lines.length; i++) {
      const line = pattern.lines[i];
      if (used.has(i) || (line.a !== at && line.b !== at)) continue;
      used.add(i);
      const ok = walk(otherEnd(line, at), left - 1);
      used.delete(i);
      if (ok) return true;
    }
    return false;
  };
  return walk(penAt(pattern, trace)!, pattern.lines.length - trace.lines.length);
}

/** A random drawing: a start dot and some lines, each one touching the pen. */
function randomTrace(pattern: Pattern, rng: () => number, length: number): Trace {
  const start = Math.floor(rng() * pattern.dots.length);
  const lines: number[] = [];
  let at = start;
  while (lines.length < length) {
    const next = pattern.lines.flatMap((line, i) => (!lines.includes(i) && (line.a === at || line.b === at) ? [i] : []));
    if (!next.length) break;
    const pick = next[Math.floor(rng() * next.length)];
    lines.push(pick);
    at = otherEnd(pattern.lines[pick], at);
  }
  return { start, lines };
}

describe("traces", () => {
  it("follows the pen from dot to dot", () => {
    const pattern = envelope();
    const trace = { start: 0, lines: [0, 1, 4] };
    expect(route(pattern, trace)).toEqual([0, 1, 2, 0]);
    expect(penAt(pattern, trace)).toBe(0);
    expect(penAt(pattern, { start: null, lines: [] })).toBeNull();
  });

  it("rejects lines that don't touch the pen, or are traced twice", () => {
    const pattern = envelope();
    expect(isValidTrace(pattern, { start: 0, lines: [0, 1] })).toBe(true);
    expect(isValidTrace(pattern, { start: 0, lines: [1] })).toBe(false);
    expect(isValidTrace(pattern, { start: 0, lines: [0, 0] })).toBe(false);
    expect(isValidTrace(pattern, { start: 9, lines: [] })).toBe(false);
    expect(isValidTrace(pattern, { start: null, lines: [0] })).toBe(false);
  });
});

describe("Solver", () => {
  it("starts at the odd dots when there are two, anywhere when there are none", () => {
    expect(new Solver(envelope()).startDots()).toEqual([0, 2]);
    expect(new Solver(EASY[0].pattern).startDots()).toHaveLength(EASY[0].pattern.dots.length);
  });

  it("knows a wrong start dot can't finish", () => {
    const solver = new Solver(envelope());
    expect(solver.canFinish({ start: 0, lines: [] })).toBe(true);
    expect(solver.canFinish({ start: 1, lines: [] })).toBe(false);
    expect(solver.lastGood({ start: 1, lines: [] })).toBe(-1);
  });

  it("won't cross a bridge while there's another way (Fleury's rule)", () => {
    // From the stalk's end (an odd dot), the petal there comes first: crossing the
    // stalk would leave it behind.
    const flowers = new Solver(twoFlowers());
    expect(flowers.safeLines({ start: 1, lines: [] })).toEqual([0, 1]);
    expect(flowers.canFinish({ start: 1, lines: [2] })).toBe(false);

    // At the corner with the petal, the hint goes round the petal, not on along the square.
    const envelope = new Solver(envelopeWithPetal());
    expect(envelope.safeLines({ start: 0, lines: [0] })).toEqual([5, 6]);
  });

  it("finds the last line a stuck drawing could still be finished from", () => {
    const solver = new Solver(envelopeWithPetal());
    const stuck = { start: 0, lines: [0, 1, 2, 3] };
    expect(solver.canFinish(stuck)).toBe(false);
    expect(solver.lastGood(stuck)).toBe(1);
  });

  it("calls a drawing stuck exactly when no way to finish exists", () => {
    const rng = seeded(7);
    const patterns = [envelope(), twoFlowers(), ...EASY.map((entry) => entry.pattern)];
    for (const pattern of patterns) {
      const solver = new Solver(pattern);
      for (let k = 0; k < 60; k++) {
        const trace = randomTrace(pattern, rng, Math.floor(rng() * pattern.lines.length));
        expect(solver.canFinish(trace)).toBe(reallyFinishable(pattern, trace));
      }
    }
  });

  it("gives hints that never lead into a dead end, all the way to the end", () => {
    const rng = seeded(11);
    for (const { pattern } of EASY) {
      const solver = new Solver(pattern);
      for (let k = 0; k < 20; k++) {
        // Any drawing that can still be finished, then hints only.
        let trace = randomTrace(pattern, rng, Math.floor(rng() * pattern.lines.length));
        if (!solver.canFinish(trace)) trace = { start: trace.start, lines: trace.lines.slice(0, solver.lastGood(trace)) };
        if (solver.lastGood(trace) < 0) continue;
        while (trace.lines.length < pattern.lines.length) {
          const next = solver.hint(trace);
          expect(next).not.toBeNull();
          trace = { start: trace.start, lines: [...trace.lines, next!] };
          expect(solver.canFinish(trace)).toBe(true);
        }
        expect(isValidTrace(pattern, trace)).toBe(true);
      }
    }
  });

  it("solves every Easy pattern from each dot that can start it", () => {
    for (const { pattern } of EASY) {
      const solver = new Solver(pattern);
      for (const start of solver.startDots()) {
        const rest = solver.finish({ start, lines: [] });
        expect(rest).not.toBeNull();
        expect(new Set(rest).size).toBe(pattern.lines.length);
        expect(isValidTrace(pattern, { start, lines: rest! })).toBe(true);
      }
    }
  });

  it("has no hint once the drawing is finished or stuck", () => {
    const pattern = twoFlowers();
    const solver = new Solver(pattern);
    const done = solver.solve();
    expect(solver.hint(done)).toBeNull();
    expect(solver.hint({ start: 1, lines: [2, 3] })).toBeNull();
    expect(solver.hint({ start: null, lines: [] })).toBeNull();
  });
});
