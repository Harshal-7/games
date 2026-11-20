import { describe, expect, it } from "vitest";

import { chances, pickFair, settle, type Ledger } from "./fair";
import { seeded, type Rng } from "./random";

const ids = (n: number) => Array.from({ length: n }, (_, i) => `p${i}`);

/** Plays `rounds` picks and returns how often each player was picked. */
function play(players: string[], seats: number, rounds: number, rng: Rng, fair = true) {
  let ledger: Ledger = {};
  const counts = new Map(players.map((id) => [id, 0]));
  for (let r = 0; r < rounds; r++) {
    const picked = fair
      ? pickFair(players, ledger, seats, rng)
      : [...players].sort(() => rng() - 0.5).slice(0, seats);
    ledger = settle(players, ledger, picked);
    for (const id of picked) counts.set(id, counts.get(id)! + 1);
  }
  return [...counts.values()];
}

describe("fair picks", () => {
  it("picks the right number of different players", () => {
    const rng = seeded(1);
    for (let i = 0; i < 50; i++) {
      const picked = pickFair(ids(7), {}, 3, rng);
      expect(new Set(picked).size).toBe(3);
    }
  });

  it("keeps everyone within a turn or two, where plain random drifts", () => {
    const rng = seeded(42);
    const games = 400;
    let fairLeftOut = 0;
    let randomLeftOut = 0;
    let fairWideGaps = 0;
    for (let g = 0; g < games; g++) {
      // 5 players, 1 imposter, 15 rounds: 3 turns each if it were perfectly even.
      const fair = play(ids(5), 1, 15, rng);
      const plain = play(ids(5), 1, 15, rng, false);
      if (fair.includes(0)) fairLeftOut++;
      if (plain.includes(0)) randomLeftOut++;
      if (Math.max(...fair) - Math.min(...fair) > 2) fairWideGaps++;
    }
    expect(fairLeftOut).toBe(0);
    expect(randomLeftOut).toBeGreaterThan(games * 0.08);
    expect(fairWideGaps).toBeLessThan(games * 0.05);
  });

  it("stays fair with two imposters", () => {
    const rng = seeded(7);
    for (let g = 0; g < 200; g++) {
      const counts = play(ids(8), 2, 16, rng);
      expect(Math.min(...counts)).toBeGreaterThan(0);
      expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(3);
    }
  });

  it("never rules anyone out, even right after they were picked", () => {
    const players = ids(5);
    let ledger: Ledger = {};
    // p0 was imposter three rounds in a row.
    for (let r = 0; r < 3; r++) ledger = settle(players, ledger, ["p0"]);
    const odds = chances(players, ledger);
    expect(odds.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
    expect(odds[0]).toBeGreaterThan(0.015);
    expect(odds[0]).toBeLessThan(odds[1]);
  });

  it("gives an even chance at the start and to someone who joins later", () => {
    const start = chances(ids(4), {});
    for (const p of start) expect(p).toBeCloseTo(0.25);

    // After 8 rounds p0 has had 3 turns, p3 one, p1 and p2 two each. p4 joins even,
    // like p1 and p2: behind p3 (owed a turn), ahead of p0 (one turn too many).
    const ledger: Ledger = {
      p0: { owed: 2, taken: 3 },
      p1: { owed: 2, taken: 2 },
      p2: { owed: 2, taken: 2 },
      p3: { owed: 2, taken: 1 },
    };
    const odds = chances(ids(5), ledger);
    expect(odds[4]).toBeCloseTo(odds[1]);
    expect(odds[4]).toBeGreaterThan(odds[0]);
    expect(odds[4]).toBeLessThan(odds[3]);
  });
});
