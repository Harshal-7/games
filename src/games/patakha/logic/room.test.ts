import { describe, expect, it } from "vitest";

import type { Player } from "@/party/logic/players";
import { seeded, type Rng } from "@/party/logic/random";

import { PACK_IDS } from "./prompts";
import {
  alive,
  DEFAULT_OPTIONS,
  LIGHT_GUARD_MS,
  newRoom,
  nextPlayer,
  parseRoom,
  PASS_GUARD_MS,
  reduce,
  RELOAD_LEFT_MS,
  starter,
  startProblem,
  winner,
  type Action,
  type Game,
  type Room,
} from "./room";

const people = (n: number): Player[] => Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, name: `P${i + 1}` }));

function apply(room: Room, ...actions: Action[]): Room {
  return actions.reduce(reduce, room);
}

/** A room with `n` players and a game ready to light, its first holder set to p1. */
function ready(n = 4, options = DEFAULT_OPTIONS): Room {
  const room = apply(newRoom(people(n), options), { type: "start", rng: seeded(1) });
  return { ...room, game: { ...room.game!, holder: "p1" } };
}

const game = (room: Room): Game => room.game!;
const endsAt = (room: Room) => game(room).fuse!.timer.endsAt!;

/** Lights at `now`, then lets the fuse run out in whoever's hands it is. */
function burnOut(room: Room, now: number): Room {
  const lit = reduce(room, { type: "light", rng: seeded(now), now });
  return reduce(lit, { type: "bang", now: endsAt(lit) });
}

describe("setup", () => {
  it("needs 3 players and a prompt pack to start", () => {
    expect(startProblem(newRoom(people(2)))).toBe("Add 1 more player to start.");
    expect(startProblem(newRoom(people(3), { ...DEFAULT_OPTIONS, packs: [] }))).toBe("Pick at least one prompt pack.");
    expect(startProblem(newRoom(people(3)))).toBeNull();
    expect(reduce(newRoom(people(2)), { type: "start", rng: seeded(1) }).game).toBeNull();
  });

  it("defaults: 2 lives, a normal fuse, every pack, any language, sound on", () => {
    expect(DEFAULT_OPTIONS).toEqual({ lives: 2, fuse: "normal", packs: [...PACK_IDS], english: false, sound: true });
  });

  it("starts everyone on full lives, seated in passing order", () => {
    const room = ready(5, { ...DEFAULT_OPTIONS, lives: 3 });
    expect(game(room).seats).toEqual(["p1", "p2", "p3", "p4", "p5"]);
    expect(Object.values(game(room).lives)).toEqual([3, 3, 3, 3, 3]);
    expect(game(room).stage).toBe("ready");
  });

  it("picks who holds it first fairly, game after game", () => {
    let room = newRoom(people(4));
    const firsts: Record<string, number> = {};
    const rng = seeded(21);
    for (let i = 0; i < 40; i++) {
      room = apply(room, { type: "lobby" }, { type: "start", rng });
      firsts[game(room).holder] = (firsts[game(room).holder] ?? 0) + 1;
    }
    // Plain random leaves someone far behind now and then; the ledger keeps everyone close.
    expect(Object.keys(firsts).sort()).toEqual(["p1", "p2", "p3", "p4"]);
    for (const count of Object.values(firsts)) expect(count).toBeGreaterThanOrEqual(7);
  });

  it("changes who's playing only between games; names any time", () => {
    const room = ready(4);
    expect(reduce(room, { type: "add-player", id: "x", name: "Neha" })).toBe(room);
    expect(reduce(room, { type: "remove-player", id: "p2" })).toBe(room);
    const renamed = reduce(room, { type: "rename-player", id: "p2", name: "Neha" });
    expect(renamed.players[1].name).toBe("Neha");
  });
});

describe("passing", () => {
  it("passes to the next seat round the table, and wraps around", () => {
    let room = reduce(ready(3), { type: "light", rng: seeded(2), now: 1_000 });
    const order = [game(room).holder];
    for (let t = 2_000; t <= 6_000; t += 1_000) {
      room = reduce(room, { type: "pass", now: t });
      order.push(game(room).holder);
    }
    expect(order).toEqual(["p1", "p2", "p3", "p1", "p2", "p3"]);
    expect(game(room).passes).toBe(5);
  });

  it("ignores a second tap within 300 ms, so a double tap can't skip anyone", () => {
    let room = reduce(ready(4), { type: "light", rng: seeded(2), now: 1_000 });
    // Too soon after lighting it, too.
    expect(reduce(room, { type: "pass", now: 1_000 + PASS_GUARD_MS - 1 })).toBe(room);
    room = reduce(room, { type: "pass", now: 2_000 });
    expect(game(room).holder).toBe("p2");
    expect(reduce(room, { type: "pass", now: 2_120 })).toBe(room);
    expect(reduce(room, { type: "pass", now: 2_000 + PASS_GUARD_MS - 1 })).toBe(room);
    expect(game(reduce(room, { type: "pass", now: 2_000 + PASS_GUARD_MS })).holder).toBe("p3");
  });

  it("skips players who are out", () => {
    const room = ready(5);
    const g: Game = { ...game(room), lives: { p1: 2, p2: 0, p3: 1, p4: 0, p5: 1 } };
    expect(nextPlayer(g, "p1")).toBe("p3");
    expect(nextPlayer(g, "p3")).toBe("p5");
    expect(nextPlayer(g, "p5")).toBe("p1");
    expect(alive(g)).toEqual(["p1", "p3", "p5"]);
  });

  it("does nothing while paused, after the fuse runs out, or before it's lit", () => {
    const lit = reduce(ready(4), { type: "light", rng: seeded(2), now: 1_000 });
    const paused = reduce(lit, { type: "pause", now: 2_000 });
    expect(reduce(paused, { type: "pass", now: 3_000 })).toBe(paused);
    expect(reduce(lit, { type: "pass", now: endsAt(lit) })).toBe(lit);
    expect(reduce(lit, { type: "pass", now: endsAt(lit) + 50 })).toBe(lit);
    const notLit = ready(4);
    expect(reduce(notLit, { type: "pass", now: 5_000 })).toBe(notLit);
  });
});

describe("the bang", () => {
  it("only goes off once the fuse has run out", () => {
    const lit = reduce(ready(4), { type: "light", rng: seeded(4), now: 1_000 });
    expect(reduce(lit, { type: "bang", now: endsAt(lit) - 1 })).toBe(lit);
    const banged = reduce(lit, { type: "bang", now: endsAt(lit) });
    expect(game(banged).stage).toBe("bang");
    expect(game(banged).bangAt).toBe(endsAt(lit));
    // It can't go off twice.
    expect(reduce(banged, { type: "bang", now: endsAt(lit) + 10 })).toBe(banged);
  });

  it("costs whoever holds it a life, and the loser starts the next round", () => {
    let room = reduce(ready(4), { type: "light", rng: seeded(4), now: 1_000 });
    room = apply(room, { type: "pass", now: 2_000 }, { type: "pass", now: 3_000 });
    expect(game(room).holder).toBe("p3");
    room = reduce(room, { type: "bang", now: endsAt(room) });
    expect(game(room).lives).toEqual({ p1: 2, p2: 2, p3: 1, p4: 2 });
    expect(starter(game(room))).toBe("p3");
    const next = reduce(room, { type: "light", rng: seeded(5), now: endsAt(room) + LIGHT_GUARD_MS });
    expect(game(next)).toMatchObject({ stage: "burning", holder: "p3", round: 2, passes: 0 });
    expect(game(next).prompt).not.toBe(game(room).prompt);
  });

  it("waits a second after the bang before the next fuse can be lit", () => {
    const banged = burnOut(ready(4), 1_000);
    const at = game(banged).bangAt!;
    expect(reduce(banged, { type: "light", rng: seeded(1), now: at + 200 })).toBe(banged);
    expect(reduce(banged, { type: "light", rng: seeded(1), now: at + LIGHT_GUARD_MS - 1 })).toBe(banged);
    expect(game(reduce(banged, { type: "light", rng: seeded(1), now: at + LIGHT_GUARD_MS })).stage).toBe("burning");
  });

  it("when the loser is out, the next player still in starts", () => {
    const room = ready(4, { ...DEFAULT_OPTIONS, lives: 1 });
    // p1 holds it at the bang and is out; p2 is next round the table.
    const banged = burnOut(room, 1_000);
    expect(game(banged).lives.p1).toBe(0);
    expect(starter(game(banged))).toBe("p2");
    // And p1 is skipped from then on.
    let next = reduce(banged, { type: "light", rng: seeded(1), now: game(banged).bangAt! + LIGHT_GUARD_MS });
    expect(game(next).holder).toBe("p2");
    for (let t = 0; t < 3; t++) next = reduce(next, { type: "pass", now: game(next).passedAt! + PASS_GUARD_MS });
    expect(game(next).holder).toBe("p2");
  });

  it("the last one standing wins, and wins carry over to the next game", () => {
    let room = ready(3, { ...DEFAULT_OPTIONS, lives: 1 });
    room = burnOut(room, 1_000); // p1 out
    expect(winner(game(room))).toBeNull();
    room = burnOut(room, game(room).bangAt! + LIGHT_GUARD_MS); // p2 out
    expect(winner(game(room))).toBe("p3");
    expect(room.wins).toEqual({ p3: 1 });
    expect(room.played).toBe(1);
    // No more fuses once someone has won.
    expect(reduce(room, { type: "light", rng: seeded(1), now: Date.now() })).toBe(room);
    // Play again: full lives again, wins kept.
    const again = reduce(room, { type: "start", rng: seeded(8) });
    expect(game(again).stage).toBe("ready");
    expect(Object.values(game(again).lives)).toEqual([1, 1, 1]);
    expect(again.wins).toEqual({ p3: 1 });
  });

  it("can't start a new game over one still being played", () => {
    const room = burnOut(ready(4), 1_000);
    expect(reduce(room, { type: "start", rng: seeded(1) })).toBe(room);
    // Leaving it counts for nobody.
    const left = reduce(room, { type: "lobby" });
    expect(left.game).toBeNull();
    expect(left.wins).toEqual({});
    expect(left.played).toBe(0);
  });
});

describe("pausing", () => {
  it("keeps the time left while paused, and burns on from there", () => {
    let room = reduce(ready(4), { type: "light", rng: seeded(6), now: 1_000 });
    const end = endsAt(room);
    room = reduce(room, { type: "pause", now: 4_000 });
    expect(game(room).fuse!.timer).toEqual({ endsAt: null, left: end - 4_000 });
    // A long call later…
    room = reduce(room, { type: "resume", now: 600_000 });
    expect(endsAt(room)).toBe(600_000 + end - 4_000);
    expect(reduce(room, { type: "bang", now: endsAt(room) - 1 })).toBe(room);
  });

  it("resuming a fuse that ran out as it paused goes off in the same hands", () => {
    let room = reduce(ready(4), { type: "light", rng: seeded(6), now: 1_000 });
    room = reduce(room, { type: "pause", now: endsAt(room) + 500 });
    expect(game(room).fuse!.timer.left).toBe(0);
    room = reduce(room, { type: "resume", now: 900_000 });
    expect(game(room).stage).toBe("bang");
    expect(game(room).lives.p1).toBe(1);
  });

  it("a pass right after Resume is ignored too", () => {
    let room = reduce(ready(4), { type: "light", rng: seeded(6), now: 1_000 });
    room = apply(room, { type: "pause", now: 2_000 }, { type: "resume", now: 9_000 });
    expect(reduce(room, { type: "pass", now: 9_100 })).toBe(room);
  });
});

/** Plays a whole game with seeded taps: random passes, then the fuse runs out. */
function playOut(players: number, lives: number, rng: Rng): { room: Room; rounds: number } {
  let room = apply(newRoom(people(players), { ...DEFAULT_OPTIONS, lives }), { type: "start", rng });
  let now = 1_000_000;
  let rounds = 0;
  while (!winner(game(room))) {
    const before = game(room);
    const lighter = starter(before);
    room = reduce(room, { type: "light", rng, now });
    expect(game(room).holder).toBe(lighter);
    expect(game(room).lives[lighter]).toBeGreaterThan(0);
    const end = endsAt(room);
    while (now + 400 < end && rng() < 0.9) {
      now += 300 + Math.floor(rng() * 4_000);
      if (now >= end) break;
      const holder = game(room).holder;
      room = reduce(room, { type: "pass", now });
      expect(game(room).holder).toBe(nextPlayer(game(room), holder));
      expect(game(room).lives[game(room).holder]).toBeGreaterThan(0);
    }
    now = end;
    const loser = game(room).holder;
    room = reduce(room, { type: "bang", now });
    expect(game(room).lives[loser]).toBe(before.lives[loser] - 1);
    rounds++;
    now += LIGHT_GUARD_MS;
  }
  return { room, rounds };
}

describe("whole games", () => {
  it.each([3, 4, 7, 12, 20])("%i players play to one winner", (players) => {
    for (const seed of [1, 2, 3]) {
      for (const lives of [1, 2, 3]) {
        const { room, rounds } = playOut(players, lives, seeded(seed * 100 + players));
        const g = game(room);
        const champ = winner(g)!;
        // Every round costs exactly one life, so a game is always players × lives − (winner's lives left) rounds.
        expect(rounds).toBe(players * lives - g.lives[champ]);
        expect(g.round).toBe(rounds);
        expect(Object.values(g.lives).every((l) => l >= 0)).toBe(true);
        expect(room.wins).toEqual({ [champ]: 1 });
      }
    }
  });
});

describe("saving", () => {
  it("survives a round trip and rejects junk", () => {
    const room = burnOut(ready(5), 1_000);
    expect(parseRoom(JSON.stringify(room), 0)).toEqual(room);
    expect(parseRoom(null)).toBeNull();
    expect(parseRoom("{")).toBeNull();
    expect(parseRoom(JSON.stringify({ version: 2, players: [] }))).toBeNull();
  });

  it("brings a fuse that was still burning back paused, with a moment left", () => {
    const lit = reduce(ready(4), { type: "light", rng: seeded(3), now: 1_000 });
    const end = endsAt(lit);
    const soon = parseRoom(JSON.stringify(lit), end - 10_000)!;
    expect(soon.game!.fuse!.timer).toEqual({ endsAt: null, left: 10_000 });
    const late = parseRoom(JSON.stringify(lit), end + 60_000)!;
    expect(late.game!.fuse!.timer).toEqual({ endsAt: null, left: RELOAD_LEFT_MS });
    expect(late.game!.holder).toBe("p1");
  });

  it("fills in missing options and drops a game that doesn't match the players", () => {
    const room = ready(4);
    const raw = JSON.parse(JSON.stringify(room));
    raw.options = { lives: 9, fuse: "huge", packs: ["screen", "nope"] };
    const parsed = parseRoom(JSON.stringify(raw))!;
    expect(parsed.options).toEqual({ ...DEFAULT_OPTIONS, lives: 3, packs: ["screen"] });
    raw.players = raw.players.slice(1);
    expect(parseRoom(JSON.stringify(raw))!.game).toBeNull();
  });
});
