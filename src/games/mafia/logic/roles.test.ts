import { describe, expect, it } from "vitest";

import { seeded } from "@/party/logic/random";

import {
  autoMafia,
  dealRoles,
  mafiaCount,
  maxMafia,
  NO_LEDGERS,
  ROLE_LINES,
  ROLES,
  settleRoles,
  type Ledgers,
  type Role,
} from "./roles";

const seats = (n: number) => Array.from({ length: n }, (_, i) => `p${i}`);
const count = (roles: Record<string, Role>, role: Role) => Object.values(roles).filter((r) => r === role).length;

describe("role counts", () => {
  it("deals Mafia by table size: 5–6 → 1, 7–9 → 2, 10–13 → 3, 14–15 → 4", () => {
    expect([5, 6, 7, 8, 9, 10, 13, 14, 15].map(autoMafia)).toEqual([1, 1, 2, 2, 2, 3, 3, 4, 4]);
    expect([5, 6, 7, 8, 9, 10, 13, 14, 15].map((n) => mafiaCount(n, null))).toEqual([1, 1, 2, 2, 2, 3, 3, 4, 4]);
  });

  it("keeps the Mafia outnumbered, whatever was picked", () => {
    expect([5, 6, 7, 8, 9, 15].map(maxMafia)).toEqual([2, 2, 3, 3, 4, 4]);
    expect(mafiaCount(5, 4)).toBe(2);
    expect(mafiaCount(7, 3)).toBe(3);
    expect(mafiaCount(12, 1)).toBe(1);
    for (let n = 5; n <= 15; n++) {
      for (const wanted of [null, 1, 2, 3, 4]) {
        const m = mafiaCount(n, wanted);
        expect(m).toBeGreaterThanOrEqual(1);
        expect(m).toBeLessThan(n - m);
      }
    }
  });

  it("deals exactly the cast: the Mafia, one Doctor, one Police, Villagers for the rest", () => {
    const rng = seeded(4);
    for (let n = 5; n <= 15; n++) {
      const mafia = mafiaCount(n, null);
      const roles = dealRoles(seats(n), { mafia, doctor: true, police: true }, NO_LEDGERS, rng);
      expect(Object.keys(roles)).toEqual(seats(n));
      expect(count(roles, "mafia")).toBe(mafia);
      expect(count(roles, "doctor")).toBe(1);
      expect(count(roles, "police")).toBe(1);
      expect(count(roles, "villager")).toBe(n - mafia - 2);
    }
    const plain = dealRoles(seats(7), { mafia: 2, doctor: false, police: false }, NO_LEDGERS, rng);
    expect([count(plain, "mafia"), count(plain, "doctor"), count(plain, "police"), count(plain, "villager")]).toEqual([
      2, 0, 0, 5,
    ]);
  });

  it("has a card line for every role", () => {
    for (const role of ROLES) expect(ROLE_LINES[role].length).toBeGreaterThan(20);
  });
});

describe("fair roles", () => {
  /** Deals `games` games at one table and counts each player's turns at each role. */
  function play(n: number, games: number, seed: number) {
    const rng = seeded(seed);
    let ledgers: Ledgers = NO_LEDGERS;
    const turns = Object.fromEntries(ROLES.map((role) => [role, Object.fromEntries(seats(n).map((id) => [id, 0]))]));
    for (let g = 0; g < games; g++) {
      const roles = dealRoles(seats(n), { mafia: mafiaCount(n, null), doctor: true, police: true }, ledgers, rng);
      ledgers = settleRoles(seats(n), roles, ledgers);
      for (const [id, role] of Object.entries(roles)) turns[role][id]++;
    }
    return turns;
  }

  it("gives everyone a turn as Mafia before anyone gets a third", () => {
    let spread = 0;
    for (let seed = 1; seed <= 100; seed++) {
      // 7 players, 2 Mafia, 14 games: 4 turns each if it were perfectly even.
      const mafia = Object.values(play(7, 14, seed).mafia);
      expect(Math.min(...mafia)).toBeGreaterThan(0);
      spread = Math.max(spread, Math.max(...mafia) - Math.min(...mafia));
    }
    expect(spread).toBeLessThanOrEqual(3);
  });

  it("shares the Doctor and the Police round too", () => {
    for (let seed = 1; seed <= 50; seed++) {
      const turns = play(6, 18, seed);
      expect(Math.min(...Object.values(turns.doctor))).toBeGreaterThan(0);
      expect(Math.min(...Object.values(turns.police))).toBeGreaterThan(0);
    }
  });

  it("books each role over the players it was picked from", () => {
    const roles: Record<string, Role> = { p0: "mafia", p1: "doctor", p2: "police", p3: "villager", p4: "villager" };
    const ledgers = settleRoles(seats(5), roles, NO_LEDGERS);
    expect(ledgers.mafia.p0).toEqual({ owed: 1 / 5, taken: 1 });
    expect(ledgers.mafia.p1).toEqual({ owed: 1 / 5, taken: 0 });
    // The Doctor came from the four who weren't Mafia, the Police from the three left.
    expect(ledgers.doctor.p0).toBeUndefined();
    expect(ledgers.doctor.p1).toEqual({ owed: 1 / 4, taken: 1 });
    expect(ledgers.police.p1).toBeUndefined();
    expect(ledgers.police.p2).toEqual({ owed: 1 / 3, taken: 1 });
    // No Doctor in the game: their ledger stays as it was.
    const noDoctor = settleRoles(seats(5), { ...roles, p1: "villager" }, NO_LEDGERS);
    expect(noDoctor.doctor).toEqual({});
  });
});
