import { describe, expect, it } from "vitest";

import { seeded } from "@/party/logic/random";

import { COUNT_MS, EMPTY, FINGER_COLORS, phase, placeOf, reduce, SETTLE_MS, teamOf, type Event, type Table } from "./fingers";
import { changeOptions, DEFAULT_OPTIONS, parseOptions } from "./options";
import { makeOrder, makeTeams, pickOne, shuffle } from "./pick";

const rng = seeded(7);
const run = (table: Table, ...events: Event[]) => events.reduce(reduce, table);
const down = (id: number, now: number): Event => ({ type: "down", id, x: id * 10, y: id * 10, now });
const up = (id: number, now: number): Event => ({ type: "up", id, now });
const tick = (now: number, mode: "one" | "teams" | "order" = "one", teams = 2): Event => ({
  type: "tick",
  now,
  mode,
  teams,
  rng,
});
const END = SETTLE_MS + COUNT_MS;

describe("fair picks", () => {
  it("picks each finger equally often", () => {
    const r = seeded(1);
    const counts = new Map<number, number>();
    const runs = 50_000;
    for (let i = 0; i < runs; i++) {
      const picked = pickOne([1, 2, 3, 4, 5], r);
      counts.set(picked, (counts.get(picked) ?? 0) + 1);
    }
    for (const id of [1, 2, 3, 4, 5]) expect(Math.abs(counts.get(id)! / runs - 0.2)).toBeLessThan(0.01);
  });

  it("shuffles into every order equally often", () => {
    const r = seeded(2);
    const counts = new Map<string, number>();
    const runs = 60_000;
    for (let i = 0; i < runs; i++) {
      const key = shuffle(["a", "b", "c"], r).join("");
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    expect(counts.size).toBe(6);
    for (const n of counts.values()) expect(Math.abs(n / runs - 1 / 6)).toBeLessThan(0.01);
    // Every place in an order is fair too.
    const firsts = new Map<number, number>();
    for (let i = 0; i < 40_000; i++) {
      const first = makeOrder([1, 2, 3, 4], r)[0];
      firsts.set(first, (firsts.get(first) ?? 0) + 1);
    }
    for (const n of firsts.values()) expect(Math.abs(n / 40_000 - 0.25)).toBeLessThan(0.01);
  });

  it("makes teams whose sizes differ by one at most, with everyone on exactly one", () => {
    const r = seeded(3);
    for (let people = 2; people <= 10; people++) {
      for (let count = 2; count <= 4; count++) {
        const ids = Array.from({ length: people }, (_, i) => i);
        const teams = makeTeams(ids, count, r);
        expect(teams).toHaveLength(Math.min(count, people));
        const sizes = teams.map((t) => t.length);
        expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
        expect(teams.flat().sort((a, b) => a - b)).toEqual(ids);
      }
    }
  });

  it("puts each person on each team equally often", () => {
    const r = seeded(4);
    const onFirst = new Map<number, number>();
    const runs = 40_000;
    for (let i = 0; i < runs; i++) for (const id of makeTeams([1, 2, 3, 4, 5, 6], 2, r)[0]) {
      onFirst.set(id, (onFirst.get(id) ?? 0) + 1);
    }
    for (const n of onFirst.values()) expect(Math.abs(n / runs - 0.5)).toBeLessThan(0.01);
  });
});

describe("the countdown", () => {
  it("waits for two fingers, settles, counts down, then picks", () => {
    let table = run(EMPTY, down(1, 0));
    expect(phase(table, 10_000).kind).toBe("waiting");
    expect(reduce(table, tick(10_000))).toBe(table);

    table = reduce(table, down(2, 1000));
    expect(phase(table, 1000 + SETTLE_MS - 1).kind).toBe("settling");
    expect(phase(table, 1000 + SETTLE_MS)).toEqual({ kind: "counting", left: 3, done: 0 });
    expect(phase(table, 1000 + SETTLE_MS + 1500)).toEqual({ kind: "counting", left: 2, done: 0.5 });
    expect(phase(table, 1000 + END - 1)).toMatchObject({ kind: "counting", left: 1 });

    expect(reduce(table, tick(1000 + END - 1))).toBe(table);
    table = reduce(table, tick(1000 + END));
    expect(phase(table, 1000 + END).kind).toBe("picked");
    expect([1, 2]).toContain(table.result?.mode === "one" && table.result.picked);
  });

  it("starts over whenever a finger joins or leaves, but not when one moves", () => {
    let table = run(EMPTY, down(1, 0), down(2, 0));
    table = reduce(table, down(3, 4000));
    expect(phase(table, 4000 + SETTLE_MS - 1).kind).toBe("settling");
    table = reduce(table, up(3, 5000));
    expect(phase(table, 5000 + 100).kind).toBe("settling");
    table = reduce(table, { type: "move", id: 1, x: 99, y: 99 });
    expect(table.changedAt).toBe(5000);
    expect(table.fingers[0]).toMatchObject({ x: 99, y: 99 });
    expect(reduce(table, tick(5000 + END - 1))).toBe(table);
    expect(reduce(table, tick(5000 + END)).result).not.toBeNull();
  });

  it("going down to one finger stops the count", () => {
    const table = run(EMPTY, down(1, 0), down(2, 0), up(2, 2000));
    expect(phase(table, 2000 + END).kind).toBe("waiting");
    expect(reduce(table, tick(2000 + END))).toBe(table);
  });

  it("keeps the pick until every finger lifts, ignoring late fingers", () => {
    let table = run(EMPTY, down(1, 0), down(2, 0), down(3, 0), tick(END));
    const result = table.result;
    expect(result).not.toBeNull();
    table = run(table, down(9, END + 100), up(1, END + 200), up(2, END + 300));
    expect(table.result).toBe(result);
    expect(table.fingers.map((f) => f.id)).toEqual([3]);
    table = reduce(table, up(3, END + 400));
    expect(table.result).toBe(result);
    table = reduce(table, up(9, END + 500));
    expect(table).toBe(EMPTY);
  });

  it("a cancelled finger (a call, a system gesture) leaves like a lifted one", () => {
    const table = run(EMPTY, down(1, 0), down(2, 0), up(2, 100), up(1, 100));
    expect(table.fingers).toEqual([]);
    expect(table.changedAt).toBeNull();
    expect(reduce(table, { type: "reset" })).toBe(EMPTY);
  });

  it("keeps each finger's colour, and reuses the lowest free one", () => {
    let table = run(EMPTY, down(1, 0), down(2, 0), down(3, 0));
    expect(table.fingers.map((f) => f.color)).toEqual([0, 1, 2]);
    table = run(table, up(2, 10), down(4, 20));
    expect(table.fingers.map((f) => [f.id, f.color])).toEqual([
      [1, 0],
      [3, 2],
      [4, 1],
    ]);
    let many = EMPTY;
    for (let id = 0; id < FINGER_COLORS + 2; id++) many = reduce(many, down(id, 0));
    expect(many.fingers.map((f) => f.color).slice(FINGER_COLORS)).toEqual([0, 1]);
  });

  it("makes teams and an order from the fingers down", () => {
    const fingers = run(EMPTY, down(1, 0), down(2, 0), down(3, 0), down(4, 0), down(5, 0));
    const teams = reduce(fingers, tick(END, "teams", 2)).result!;
    const onTeams = [1, 2, 3, 4, 5].map((id) => teamOf(teams, id));
    expect(onTeams.filter((t) => t === 0).length + onTeams.filter((t) => t === 1).length).toBe(5);
    expect(placeOf(teams, 1)).toBeNull();

    const order = reduce(fingers, tick(END, "order")).result!;
    expect([1, 2, 3, 4, 5].map((id) => placeOf(order, id)).sort()).toEqual([1, 2, 3, 4, 5]);
    expect(teamOf(order, 1)).toBeNull();
  });
});

describe("options", () => {
  it("reads saves defensively and keeps teams between 2 and 4", () => {
    expect(parseOptions(null)).toBeNull();
    expect(parseOptions("nope")).toBeNull();
    expect(parseOptions(JSON.stringify({ mode: "order", teams: 3, sound: false }))).toEqual({
      mode: "order",
      teams: 3,
      sound: false,
    });
    expect(parseOptions(JSON.stringify({ mode: "x", teams: 9 }))).toEqual(DEFAULT_OPTIONS);
    expect(changeOptions(DEFAULT_OPTIONS, { teams: 7 }).teams).toBe(4);
    expect(changeOptions(DEFAULT_OPTIONS, { mode: "one" })).toBe(DEFAULT_OPTIONS);
  });
});
