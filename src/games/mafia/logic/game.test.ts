import { describe, expect, it } from "vitest";

import { seeded } from "@/party/logic/random";
import { timeLeft } from "@/party/logic/timer";

import {
  alive,
  CLOSE_MS,
  DUSK_MS,
  JITTER_MS,
  lastNight,
  newRoom,
  parseRoom,
  policeAnswer,
  reduce,
  RESULT_MS,
  startProblem,
  STEP_MS,
  targets,
  votedOut,
  winnerOf,
  type Action,
  type Room,
} from "./game";
import { narration } from "./narration";
import type { Role } from "./roles";
import { STORIES } from "./script";

const rng = seeded(11);
const run = (room: Room, ...actions: Action[]) => actions.reduce(reduce, room);

function table(n: number, patch: Partial<Room["options"]> = {}): Room {
  let room = newRoom();
  for (let i = 0; i < n; i++) room = reduce(room, { type: "add-player", id: `p${i}`, name: `P${i}` });
  return reduce(room, { type: "options", patch });
}

/** Every player in turn takes the phone, holds their card once and passes it on. */
function dealAll(room: Room): Room {
  while (room.game?.stage === "deal") {
    const id = room.game.seats[room.game.turn];
    room = run(room, { type: "look" }, { type: "open", id }, { type: "done" });
  }
  return room;
}

/** A dealt game where seat i (p0, p1, …) has roles[i], waiting for the first night. */
function game(roles: Role[], patch: Partial<Room["options"]> = {}): Room {
  const room = dealAll(run(table(roles.length, patch), { type: "start", rng }));
  return { ...room, game: { ...room.game!, roles: Object.fromEntries(roles.map((role, i) => [`p${i}`, role])) } };
}

const night = (room: Room) => room.game!.night!;

/** Ticks the clock every 250 ms from `from` to `to`. */
function clock(room: Room, from: number, to: number): Room {
  for (let t = from; t <= to; t += 250) room = reduce(room, { type: "tick", now: t, rng });
  return room;
}

/** Ticks every 250 ms from `from` until `done` holds; gives back the room and the time it got there. */
function tickUntil(room: Room, from: number, done: (room: Room) => boolean): [Room, number] {
  let t = from;
  while (!done(room)) {
    t += 250;
    room = reduce(room, { type: "tick", now: t, rng });
    if (t > from + 600_000) throw new Error("Never got there");
  }
  return [room, t];
}

const onStep = (step: string) => (room: Room) => room.game?.night?.step === step;

type Picks = { kill: string; save?: string; check?: string };

/**
 * From the tap that starts the night to the morning, each role picking as soon as it's
 * called. A Doctor or Police with nothing in `picks` takes the first name they can.
 */
function playNight(room: Room, picks: Picks, start = 0): Room {
  room = reduce(room, { type: "nightfall", now: start });
  for (let t = start; room.game?.stage === "night"; t += 250) {
    const n = room.game.night!;
    if (n.phase === "open" && n.doneAt === null && (n.step === "mafia" || n.step === "doctor" || n.step === "police")) {
      const fallback = targets(room.game, n.step)[0];
      const id = n.step === "mafia" ? picks.kill : n.step === "doctor" ? (picks.save ?? fallback) : (picks.check ?? fallback);
      room = reduce(room, { type: "pick", id, now: t });
    }
    room = reduce(room, { type: "tick", now: t, rng });
    if (t > start + 600_000) throw new Error("The night never ended");
  }
  return room;
}

/** Morning to the verdict: talk, then the table points at `id` (null for a tie). */
const voteOut = (room: Room, id: string | null) =>
  run(room, { type: "day", now: 0 }, { type: "vote" }, { type: "vote-out", id });

const SEVEN: Role[] = ["mafia", "mafia", "doctor", "police", "villager", "villager", "villager"];
const FIVE: Role[] = ["mafia", "doctor", "police", "villager", "villager"];

describe("the table", () => {
  it("takes 5 to 15 players", () => {
    expect(startProblem(table(4))).toMatch(/Add 1 more player/);
    expect(reduce(table(4), { type: "start", rng }).game).toBeNull();
    expect(startProblem(table(5))).toBeNull();
    const full = table(15);
    expect(reduce(full, { type: "add-player", id: "x", name: "One more" })).toBe(full);
    expect(reduce(newRoom(), { type: "quick-players", count: 3, rng }).players).toHaveLength(5);
  });

  it("only changes who's playing between games, though names can change any time", () => {
    const room = run(table(6), { type: "start", rng });
    expect(reduce(room, { type: "add-player", id: "x", name: "Zoya" })).toBe(room);
    expect(reduce(room, { type: "remove-player", id: "p0" })).toBe(room);
    expect(reduce(room, { type: "rename-player", id: "p0", name: "Riya" }).players[0].name).toBe("Riya");
  });

  it("deals the cast the options ask for", () => {
    const count = (room: Room, role: Role) => Object.values(room.game!.roles).filter((r) => r === role).length;
    const dealt = run(table(8), { type: "start", rng });
    expect([count(dealt, "mafia"), count(dealt, "doctor"), count(dealt, "police")]).toEqual([2, 1, 1]);
    const plain = run(table(8, { mafia: 1, doctor: false, police: false }), { type: "start", rng });
    expect([count(plain, "mafia"), count(plain, "doctor"), count(plain, "police")]).toEqual([1, 0, 0]);
    // Asking for more Mafia than the table can take deals the most it can.
    expect(count(run(table(5, { mafia: 4 }), { type: "start", rng }), "mafia")).toBe(2);
  });
});

describe("the deal", () => {
  const start = () => run(table(6), { type: "start", rng });

  it("only opens the card on screen, and can't go back once it's open", () => {
    let room = start();
    const [first, second] = room.game!.seats;
    expect(reduce(room, { type: "open", id: first })).toBe(room);
    room = reduce(room, { type: "look" });
    expect(reduce(room, { type: "open", id: second })).toBe(room);
    expect(reduce(room, { type: "done" })).toBe(room);
    expect(reduce(room, { type: "back" }).game?.looking).toBe(false);
    room = reduce(room, { type: "open", id: first });
    expect(reduce(room, { type: "back" })).toBe(room);
    room = reduce(room, { type: "done" });
    expect([room.game?.turn, room.game?.looking]).toEqual([1, false]);
  });

  it("re-deals with fresh roles and fresh seals, and books the fair picks only once everyone has a card", () => {
    let room = run(start(), { type: "look" }, { type: "open", id: "p0" }, { type: "redeal", rng });
    expect(Object.values(room.game!.opens).every((n) => n === 0)).toBe(true);
    expect(room.game?.turn).toBe(0);
    expect(room.ledgers.mafia).toEqual({});
    room = dealAll(room);
    expect(room.game?.stage).toBe("night");
    expect(room.game?.round).toBe(1);
    const mafia = Object.keys(room.game!.roles).filter((id) => room.game!.roles[id] === "mafia");
    for (const id of room.game!.seats) expect(room.ledgers.mafia[id].taken).toBe(mafia.includes(id) ? 1 : 0);
    expect(reduce(room, { type: "redeal", rng })).toBe(room);
  });
});

describe("the night", () => {
  it("waits for the tap that starts it", () => {
    const room = game(SEVEN);
    expect(night(room).step).toBe("ready");
    expect(clock(room, 0, 60_000)).toBe(room);
    expect(night(reduce(room, { type: "nightfall", now: 500 }))).toMatchObject({ step: "dusk", since: 500 });
  });

  it("calls the Mafia, the Doctor and the Police in turn, and no turn ends before 10 seconds", () => {
    let room = reduce(game(SEVEN), { type: "nightfall", now: 0 });
    room = clock(room, 0, DUSK_MS - 250);
    expect(night(room).step).toBe("dusk");
    room = reduce(room, { type: "tick", now: DUSK_MS, rng });
    expect(night(room)).toMatchObject({ step: "mafia", phase: "open", since: DUSK_MS });

    let t = DUSK_MS;
    for (const [role, id] of [
      ["mafia", "p4"],
      ["doctor", "p5"],
      ["police", "p0"],
    ] as const) {
      const { since, until } = night(room);
      expect(night(room)).toMatchObject({ step: role, phase: "open", doneAt: null });
      expect(until - since).toBeGreaterThanOrEqual(STEP_MS);
      expect(until - since).toBeLessThan(STEP_MS + JITTER_MS);
      // A quick tap still waits out the turn.
      room = reduce(room, { type: "pick", id, now: since + 500 });
      room = clock(room, since + 500, until - 250);
      expect(night(room).phase).toBe("open");
      room = reduce(room, { type: "tick", now: until, rng });
      expect(night(room)).toMatchObject({ step: role, phase: "close", since: until });
      room = reduce(room, { type: "tick", now: until + CLOSE_MS - 1, rng });
      expect(room.game?.stage).toBe("night");
      t = until + CLOSE_MS;
      room = reduce(room, { type: "tick", now: t, rng });
    }
    expect(room.game?.stage).toBe("morning");
    expect(lastNight(room.game!)).toMatchObject({ round: 1, kill: "p4", save: "p5", check: "p0", died: "p4" });
  });

  it("waits for the Mafia however long they take", () => {
    let room = clock(reduce(game(SEVEN), { type: "nightfall", now: 0 }), 0, DUSK_MS);
    room = clock(room, DUSK_MS, DUSK_MS + 120_000);
    expect(night(room)).toMatchObject({ step: "mafia", phase: "open" });
  });

  it("still calls a Doctor or Police who is out, with the same wait", () => {
    // Night 1 the Mafia get the Doctor, night 2 the Police: both are still called after that.
    let room = playNight(game(SEVEN), { kill: "p2", save: "p4", check: "p0" });
    expect(lastNight(room.game!)?.died).toBe("p2");
    room = playNight(voteOut(room, null), { kill: "p3", check: "p5" });
    expect(lastNight(room.game!)).toMatchObject({ save: null, died: "p3" });

    room = reduce(voteOut(room, null), { type: "nightfall", now: 0 });
    let t: number;
    [room, t] = tickUntil(room, 0, onStep("mafia"));
    room = reduce(room, { type: "pick", id: "p4", now: t });
    for (const role of ["doctor", "police"] as const) {
      [room, t] = tickUntil(room, t, onStep(role));
      const { since, until } = night(room);
      expect(until - since).toBeGreaterThanOrEqual(STEP_MS);
      // Nobody can pick for them.
      expect(reduce(room, { type: "pick", id: "p5", now: t })).toBe(room);
      room = clock(room, t, until - 1);
      expect(night(room)).toMatchObject({ step: role, phase: "open" });
      room = reduce(room, { type: "tick", now: until, rng });
      expect(night(room).phase).toBe("close");
      t = until;
    }
    [room] = tickUntil(room, t, (r) => r.game?.stage === "morning");
    expect(lastNight(room.game!)?.died).toBe("p4");
  });

  it("starts each role's screen clean and only takes picks the rules allow", () => {
    let room = clock(reduce(game(SEVEN), { type: "nightfall", now: 0 }), 0, DUSK_MS);
    const g = room.game!;
    // The Mafia can't go for their own; the Police can't check themselves; the Doctor can save anyone.
    expect(targets(g, "mafia")).toEqual(["p2", "p3", "p4", "p5", "p6"]);
    expect(targets(g, "police")).toEqual(["p0", "p1", "p2", "p4", "p5", "p6"]);
    expect(targets(g, "doctor")).toEqual(g.seats);
    expect(reduce(room, { type: "pick", id: "p1", now: DUSK_MS })).toBe(room);
    room = reduce(room, { type: "pick", id: "p6", now: DUSK_MS });
    // One pick per turn.
    expect(reduce(room, { type: "pick", id: "p5", now: DUSK_MS + 10 })).toBe(room);
    expect(night(room).kill).toBe("p6");
  });

  it("lets the Doctor save themselves, but not the same person two nights running", () => {
    let room = playNight(game(SEVEN), { kill: "p4", save: "p2", check: "p0" });
    expect(room.game?.lastSave).toBe("p2");
    room = clock(reduce(voteOut(room, null), { type: "nightfall", now: 0 }), 0, DUSK_MS);
    expect(targets(room.game!, "doctor")).not.toContain("p2");
    expect(targets(room.game!, "doctor")).toContain("p5");
  });

  it("a save beats the kill: nobody dies", () => {
    const room = playNight(game(SEVEN), { kill: "p4", save: "p4", check: "p1" });
    expect(room.game?.stage).toBe("morning");
    expect(lastNight(room.game!)).toMatchObject({ kill: "p4", save: "p4", died: null, story: null });
    expect(alive(room.game!)).toHaveLength(7);
  });

  it("the Mafia's pick is out by morning, with a story", () => {
    const room = playNight(game(SEVEN), { kill: "p5", save: "p4", check: "p1" });
    expect(room.game?.out).toEqual([{ id: "p5", round: 1, when: "night" }]);
    const story = lastNight(room.game!)?.story;
    expect(STORIES).toContain(story);
    expect(room.told).toEqual([story]);
  });

  it("tells the Police the truth, and keeps it on screen for 3 seconds", () => {
    let room = reduce(game(SEVEN), { type: "nightfall", now: 0 });
    let t: number;
    [room, t] = tickUntil(room, 0, onStep("mafia"));
    room = reduce(room, { type: "pick", id: "p6", now: t });
    [room, t] = tickUntil(room, t, onStep("doctor"));
    room = reduce(room, { type: "pick", id: "p6", now: t });
    [room, t] = tickUntil(room, t, onStep("police"));
    expect(policeAnswer(room.game!)).toBeNull();
    expect(policeAnswer(reduce(room, { type: "pick", id: "p0", now: t }).game!)).toBe("mafia");
    expect(policeAnswer(reduce(room, { type: "pick", id: "p6", now: t }).game!)).toBe("not-mafia");
    // A late pick: the answer still gets its 3 seconds before "Police, close your eyes".
    const { until } = night(room);
    let late = reduce(room, { type: "pick", id: "p0", now: until - 1000 });
    late = reduce(late, { type: "tick", now: until, rng });
    expect(night(late).phase).toBe("open");
    late = reduce(late, { type: "tick", now: until - 1000 + RESULT_MS, rng });
    expect(night(late).phase).toBe("close");
  });

  it("comes back to the same step after a reload, and says the line again with a fresh wait", () => {
    let room = clock(reduce(game(SEVEN), { type: "nightfall", now: 0 }), 0, DUSK_MS + 2000);
    const saved = parseRoom(JSON.stringify(room))!;
    expect(saved).toEqual(room);
    let resumed = reduce(saved, { type: "resume", now: 100_000, rng });
    expect(night(resumed)).toMatchObject({ step: "mafia", phase: "open", since: 100_000, doneAt: null });
    expect(night(resumed).until).toBeGreaterThanOrEqual(100_000 + STEP_MS);
    // Already picked: straight to "close your eyes", keeping the pick.
    room = reduce(room, { type: "pick", id: "p4", now: DUSK_MS + 2000 });
    resumed = reduce(parseRoom(JSON.stringify(room))!, { type: "resume", now: 100_000, rng });
    expect(night(resumed)).toMatchObject({ step: "mafia", phase: "close", since: 100_000, kill: "p4" });
    expect(reduce(game(SEVEN), { type: "resume", now: 1, rng }).game?.night?.step).toBe("ready");
  });

  it("never repeats a morning story until they've all been told", () => {
    let told: string[] = [];
    const heard = new Set<string>();
    for (let i = 0; i < STORIES.length; i++) {
      const room = playNight({ ...game(SEVEN), told }, { kill: "p4", save: "p5", check: "p1" });
      const story = lastNight(room.game!)!.story!;
      expect(heard.has(story)).toBe(false);
      heard.add(story);
      told = room.told;
    }
    expect(heard.size).toBe(STORIES.length);
    const again = playNight({ ...game(SEVEN), told }, { kill: "p4", save: "p5", check: "p1" });
    expect(again.told).toHaveLength(1);
  });
});

describe("the day", () => {
  it("talks against the clock, then votes someone out and shows their role", () => {
    let room = playNight(game(SEVEN, { talk: 2 }), { kill: "p4", save: "p5", check: "p1" });
    room = reduce(room, { type: "day", now: 1000 });
    expect(room.game?.stage).toBe("day");
    expect(room.game?.timer).toEqual({ endsAt: 1000 + 120_000, left: 120_000 });
    room = reduce(room, { type: "timer", op: "pause", now: 61_000 });
    expect(timeLeft(room.game!.timer!, 99_000)).toBe(60_000);
    room = run(room, { type: "vote" }, { type: "talk" }, { type: "vote" });
    expect(room.game?.stage).toBe("vote");
    // Players who are out can't be voted out again.
    expect(reduce(room, { type: "vote-out", id: "p4" })).toBe(room);
    room = reduce(room, { type: "vote-out", id: "p6" });
    expect(room.game?.stage).toBe("verdict");
    expect(votedOut(room.game!)).toBe("p6");
    expect(room.game?.out.at(-1)).toEqual({ id: "p6", round: 1, when: "day" });
  });

  it("a tie puts nobody out", () => {
    const room = voteOut(playNight(game(SEVEN), { kill: "p4", save: "p5", check: "p1" }), null);
    expect(room.game?.stage).toBe("verdict");
    expect(votedOut(room.game!)).toBeNull();
    expect(alive(room.game!)).toHaveLength(6);
    const next = reduce(room, { type: "nightfall", now: 0 });
    expect([next.game?.stage, next.game?.round, next.game?.night?.step]).toEqual(["night", 2, "dusk"]);
  });

  it("with Vote again, a tie points once more, and a second tie puts nobody out", () => {
    let room = playNight(game(SEVEN, { tie: "again" }), { kill: "p4", save: "p5", check: "p1" });
    room = voteOut(room, null);
    expect([room.game?.stage, room.game?.ties]).toEqual(["vote", 1]);
    expect(reduce(room, { type: "vote-out", id: "p6" }).game?.out.at(-1)?.id).toBe("p6");
    room = reduce(room, { type: "vote-out", id: null });
    expect(room.game?.stage).toBe("verdict");
    expect(votedOut(room.game!)).toBeNull();
    // A new day starts with a clean slate.
    room = playNight(room, { kill: "p5", save: "p6", check: "p1" });
    expect(reduce(room, { type: "day", now: 0 }).game?.ties).toBe(0);
  });
});

describe("winning", () => {
  it("the town wins once every Mafia is out, and every town player scores", () => {
    let room = playNight(game(FIVE), { kill: "p3", save: "p1", check: "p0" });
    expect(winnerOf(room.game!)).toBeNull();
    // No ending the game while nobody has won.
    expect(reduce(room, { type: "finish" })).toBe(room);
    room = voteOut(room, "p0");
    expect(winnerOf(room.game!)).toBe("town");
    // Nobody starts another night once the game is won.
    expect(reduce(room, { type: "nightfall", now: 0 })).toBe(room);
    room = reduce(room, { type: "finish" });
    expect(room.game?.stage).toBe("end");
    expect(room.played).toBe(1);
    expect(room.scores).toEqual({ p1: 1, p2: 1, p3: 1, p4: 1 });
  });

  it("the Mafia win once there are as many of them as everyone else", () => {
    let room = playNight(game(FIVE), { kill: "p3", save: "p1", check: "p4" });
    room = voteOut(room, "p4");
    expect(winnerOf(room.game!)).toBeNull();
    room = playNight(room, { kill: "p1", save: "p2", check: "p0" });
    expect(lastNight(room.game!)?.died).toBe("p1");
    expect(winnerOf(room.game!)).toBe("mafia");
    expect(reduce(room, { type: "day", now: 0 })).toBe(room);
    room = reduce(room, { type: "finish" });
    expect(room.scores).toEqual({ p0: 2 });
  });

  it("scores carry over from game to game in the room", () => {
    let room = reduce(voteOut(playNight(game(FIVE), { kill: "p3" }), "p0"), { type: "finish" });
    room = run(room, { type: "lobby" }, { type: "start", rng });
    expect(room.game?.number).toBe(2);
    room = dealAll(room);
    room = { ...room, game: { ...room.game!, roles: { p0: "villager", p1: "mafia", p2: "doctor", p3: "police", p4: "villager" } } };
    room = reduce(voteOut(playNight(room, { kill: "p4" }), "p1"), { type: "finish" });
    expect(room.played).toBe(2);
    expect(room.scores).toEqual({ p0: 1, p1: 1, p2: 2, p3: 2, p4: 2 });
  });

  it("stopping a game halfway gives nobody points, and a new room starts the scores over", () => {
    const room = run(playNight(game(FIVE), { kill: "p3" }), { type: "lobby" });
    expect([room.game, room.played, room.scores]).toEqual([null, 0, {}]);
    const won = reduce(voteOut(playNight(game(FIVE), { kill: "p3" }), "p0"), { type: "finish" });
    const fresh = reduce(won, { type: "new-room" });
    expect([fresh.players, fresh.played, fresh.scores, fresh.ledgers.mafia]).toEqual([won.players, 0, {}, {}]);
    expect(reduce(won, { type: "clear-room" }).players).toEqual([]);
  });
});

describe("saving", () => {
  it("survives a round trip at every stage", () => {
    let room = run(table(7), { type: "start", rng });
    const check = () => expect(parseRoom(JSON.stringify(room))).toEqual(room);
    check();
    room = dealAll(room);
    check();
    room = { ...room, game: { ...room.game!, roles: Object.fromEntries(SEVEN.map((role, i) => [`p${i}`, role])) } };
    room = playNight(room, { kill: "p4", save: "p5", check: "p0" });
    check();
    room = run(room, { type: "day", now: 5 });
    check();
    room = run(room, { type: "vote" }, { type: "vote-out", id: "p0" });
    check();
    room = voteOut(playNight(room, { kill: "p5", save: "p6", check: "p1" }), "p1");
    room = reduce(room, { type: "finish" });
    expect(room.game?.stage).toBe("end");
    check();
  });

  it("rejects junk and drops a game it can't trust", () => {
    const room = playNight(game(SEVEN), { kill: "p4", save: "p5", check: "p0" });
    expect(parseRoom("not json")).toBeNull();
    expect(parseRoom(JSON.stringify({ version: 2, players: [] }))).toBeNull();
    const broken = parseRoom(
      JSON.stringify({ ...room, game: { ...room.game, roles: { ...room.game!.roles, p1: "joker" } }, options: { talk: 7 } }),
    );
    expect(broken?.game).toBeNull();
    expect(broken?.players).toHaveLength(7);
    expect(broken?.options).toEqual(newRoom().options);
    // A game with someone who's no longer at the table.
    const gone = parseRoom(JSON.stringify({ ...room, players: room.players.slice(1) }));
    expect(gone?.game).toBeNull();
    // Missing newer fields fall back to their defaults.
    const { told: _told, ledgers: _ledgers, ...older } = room;
    expect(parseRoom(JSON.stringify(older))).toMatchObject({ told: [], ledgers: { mafia: {}, doctor: {}, police: {} } });
  });
});

describe("the narrator", () => {
  it("says each moment of the night once, by its own key", () => {
    let room = game(SEVEN);
    expect(narration(room)).toBeNull();
    room = reduce(room, { type: "nightfall", now: 0 });
    expect(narration(room)).toEqual({ key: "1:1:dusk", lines: ["Night falls. Everyone, close your eyes."] });
    const [called, t] = tickUntil(room, 0, onStep("mafia"));
    room = called;
    expect(narration(room)).toEqual({ key: "1:1:mafia:open", lines: ["Mafia, open your eyes and pick someone."] });
    room = reduce(room, { type: "pick", id: "p4", now: t });
    [room] = tickUntil(room, t, (r) => r.game?.night?.phase === "close");
    expect(narration(room)).toEqual({ key: "1:1:mafia:close", lines: ["Mafia, close your eyes."] });
  });

  it("tells the morning, the vote and the verdict with names and roles", () => {
    let room = playNight(game(SEVEN), { kill: "p4", save: "p5", check: "p0" });
    const [wake, story, was] = narration(room)!.lines;
    expect(wake).toBe("Everyone, wake up.");
    expect(story).toContain("P4");
    expect(was).toBe("P4 was a Villager.");
    room = run(room, { type: "day", now: 0 }, { type: "vote" });
    expect(narration(room)?.key).toBe("1:1:vote:0");
    room = reduce(room, { type: "vote-out", id: "p0" });
    expect(narration(room)?.lines).toEqual(["P0 is out.", "P0 was Mafia."]);
    const saved = playNight(game(SEVEN), { kill: "p4", save: "p4", check: "p0" });
    expect(narration(saved)?.lines).toEqual(["Everyone, wake up.", "Nobody died last night."]);
  });
});
