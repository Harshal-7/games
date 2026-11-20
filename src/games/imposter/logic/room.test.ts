import { describe, expect, it } from "vitest";

import { seeded } from "@/party/logic/random";
import { timeLeft } from "@/party/logic/timer";

import { ANSWER_KINDS, pack, PACK_IDS, PACKS, type PackId } from "./questions";
import {
  drawQuestion,
  drawWord,
  maxImposters,
  newRoom,
  parseRoom,
  reduce,
  startProblem,
  type Action,
  type Room,
} from "./room";
import { CATEGORIES, category } from "./words";

const rng = seeded(11);

function roomWith(names: string[], patch: Partial<Room["options"]> = {}): Room {
  let room = newRoom();
  names.forEach((name, i) => (room = reduce(room, { type: "add-player", id: `id${i}`, name })));
  return reduce(room, { type: "options", patch });
}

const run = (room: Room, ...actions: Action[]) => actions.reduce(reduce, room);

/** Every player in turn takes the phone, opens their card once and passes it on. */
function dealAll(room: Room, now = 0): Room {
  while (room.round?.stage === "deal") {
    const id = room.round.seats[room.round.turn];
    room = run(room, { type: "look" }, { type: "open", id }, { type: "done", now });
  }
  return room;
}

describe("words", () => {
  it("has no duplicates and a hint for every word", () => {
    const all = CATEGORIES.flatMap((c) => c.words);
    const names = all.map(([word]) => word.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
    for (const [word, hint] of all) {
      expect(hint.trim()).not.toBe("");
      expect(hint.toLowerCase()).not.toBe(word.toLowerCase());
    }
    for (const c of CATEGORIES) expect(c.words.length).toBeGreaterThanOrEqual(30);
  });

  it("doesn't repeat a word until its category runs out, then starts it over", () => {
    const size = category("food").words.length;
    let used: string[] = [];
    const seen = new Set<string>();
    for (let i = 0; i < size; i++) {
      const drawn = drawWord(["food"], used, null, rng);
      expect(seen.has(drawn.word)).toBe(false);
      seen.add(drawn.word);
      used = drawn.used;
    }
    const again = drawWord(["food"], used, null, rng);
    expect(again.used).toEqual([again.word]);
  });

  it("switches category every round when there's a choice", () => {
    let last = null as ReturnType<typeof drawWord>["category"] | null;
    let used: string[] = [];
    for (let i = 0; i < 40; i++) {
      const drawn = drawWord(["food", "animals", "places"], used, last, rng);
      expect(drawn.category).not.toBe(last);
      last = drawn.category;
      used = drawn.used;
    }
  });
});

describe("room setup", () => {
  it("won't add a name that's taken, or start short of players", () => {
    const room = roomWith(["Riya", "Aman"]);
    expect(reduce(room, { type: "add-player", id: "x", name: "RIYA" })).toBe(room);
    expect(startProblem(room)).toMatch(/Add 1 more player/);
    expect(reduce(room, { type: "start", rng })).toBe(room);
  });

  it("quick start adds numbered players, only to an empty table", () => {
    const room = reduce(newRoom(), { type: "quick-players", count: 5, rng });
    expect(room.players.map((p) => p.name)).toEqual(["Player 1", "Player 2", "Player 3", "Player 4", "Player 5"]);
    expect(new Set(room.players.map((p) => p.id)).size).toBe(5);
    expect(startProblem(room)).toBeNull();
    expect(reduce(room, { type: "quick-players", count: 5, rng })).toBe(room);
    expect(reduce(newRoom(), { type: "quick-players", count: 99, rng }).players).toHaveLength(20);
    expect(reduce(newRoom(), { type: "quick-players", count: 1, rng }).players).toHaveLength(3);
  });

  it("a new game keeps the players; clearing the room keeps only the options", () => {
    const played = dealAll(run(roomWith(["A", "B", "C"], { sound: false }), { type: "start", rng }));
    const fresh = reduce(played, { type: "new-room" });
    expect(fresh.players).toEqual(played.players);
    expect([fresh.round, fresh.played, fresh.scores]).toEqual([null, 0, {}]);
    const cleared = reduce(played, { type: "clear-room" });
    expect(cleared).toEqual(newRoom([], played.options));
    expect(cleared.options.sound).toBe(false);
  });

  it("keeps imposters outnumbered", () => {
    expect([3, 4, 5, 6, 7, 12].map(maxImposters)).toEqual([1, 1, 2, 2, 3, 3]);
    const room = run(roomWith(["A", "B", "C", "D"], { imposters: 3 }), { type: "start", rng });
    expect(room.round?.imposters).toHaveLength(1);
  });
});

describe("a round", () => {
  const start = () => run(roomWith(["Riya", "Aman", "Kabir", "Zoya", "Dev"]), { type: "start", rng });

  it("deals in seat order and only opens the card on screen", () => {
    let room = start();
    const [first, second] = room.round!.seats;
    // Nobody can open a card from the pass-the-phone screen, or someone else's card.
    expect(reduce(room, { type: "open", id: first })).toBe(room);
    room = reduce(room, { type: "look" });
    expect(reduce(room, { type: "open", id: second })).toBe(room);
    // Can't move on without opening your card.
    expect(reduce(room, { type: "done", now: 0 })).toBe(room);
    room = run(room, { type: "open", id: first }, { type: "done", now: 0 });
    expect(room.round?.turn).toBe(1);
    expect(room.round?.looking).toBe(false);
  });

  it("can't go back once a card is open, so a peek always leaves a mark", () => {
    let room = run(start(), { type: "look" });
    room = reduce(room, { type: "back" });
    expect(room.round?.looking).toBe(false);
    room = run(room, { type: "look" }, { type: "open", id: room.round!.seats[0] });
    expect(reduce(room, { type: "back" })).toBe(room);
  });

  it("re-deals with a fresh word and fresh seals, without counting the round", () => {
    let room = start();
    const first = room.round!;
    room = run(room, { type: "look" }, { type: "open", id: first.seats[0] }, { type: "redeal", rng });
    const round = room.round!;
    if (round.mode !== "words" || first.mode !== "words") throw new Error("expected a Words round");
    expect(round.word).not.toBe(first.word);
    expect(Object.values(round.opens).every((n) => n === 0)).toBe(true);
    expect(round.turn).toBe(0);
    expect(room.used).toContain(first.word);
    expect(room.ledger).toEqual({});
  });

  it("starts talking once everyone has their card, and books the fair picks then", () => {
    const room = dealAll(start(), 1000);
    const round = room.round!;
    expect(round.stage).toBe("talk");
    expect(round.timer).toEqual({ endsAt: 1000 + 180_000, left: 180_000 });
    for (const id of round.seats) {
      expect(room.ledger[id].taken).toBe(round.imposters.includes(id) ? 1 : 0);
      expect(room.ledger[id].owed).toBeCloseTo(1 / 5);
    }
    expect(reduce(room, { type: "redeal", rng })).toBe(room);
  });

  it("logs anyone who opens their card again while talking", () => {
    let room = dealAll(start());
    const id = room.round!.seats[2];
    room = reduce(room, { type: "open", id });
    expect(room.round?.rechecks).toEqual([id]);
    expect(room.round?.opens[id]).toBe(2);
  });

  it("pauses, resumes and adds time", () => {
    let room = dealAll(start(), 0);
    room = reduce(room, { type: "timer", op: "pause", now: 60_000 });
    expect(room.round?.timer).toEqual({ endsAt: null, left: 120_000 });
    room = reduce(room, { type: "timer", op: "add", now: 90_000 });
    expect(timeLeft(room.round!.timer!, 99_000)).toBe(150_000);
    room = reduce(room, { type: "timer", op: "resume", now: 100_000 });
    expect(timeLeft(room.round!.timer!, 110_000)).toBe(140_000);
  });

  it("crew wins when the imposter is caught and misses the word", () => {
    let room = run(dealAll(start()), { type: "vote" });
    const [imposter] = room.round!.imposters;
    room = reduce(room, { type: "accuse", ids: [imposter] });
    expect(room.round?.stage).toBe("guess");
    room = reduce(room, { type: "guess", correct: false });
    expect(room.round?.stage).toBe("result");
    expect(room.played).toBe(1);
    for (const id of room.round!.seats) expect(room.scores[id] ?? 0).toBe(id === imposter ? 0 : 1);
  });

  it("imposter gets 1 for guessing the word when caught, 2 for getting away", () => {
    let caught = run(dealAll(start()), { type: "vote" });
    const [imposter] = caught.round!.imposters;
    caught = run(caught, { type: "accuse", ids: [imposter] }, { type: "guess", correct: true });
    expect(caught.scores).toEqual({ [imposter]: 1 });

    let escaped = run(dealAll(start()), { type: "vote" });
    const innocent = escaped.round!.seats.find((id) => !escaped.round!.imposters.includes(id))!;
    escaped = reduce(escaped, { type: "accuse", ids: [innocent] });
    expect(escaped.round?.stage).toBe("result");
    expect(escaped.scores).toEqual({ [escaped.round!.imposters[0]]: 2 });
  });

  it("needs exactly one vote per imposter", () => {
    const room = run(dealAll(start()), { type: "vote" });
    expect(reduce(room, { type: "accuse", ids: [] })).toBe(room);
    expect(reduce(room, { type: "accuse", ids: room.round!.seats.slice(0, 2) })).toBe(room);
  });
});

describe("saving", () => {
  it("survives a round trip and rejects junk", () => {
    const room = dealAll(run(roomWith(["Riya", "Aman", "Kabir"]), { type: "start", rng }));
    expect(parseRoom(JSON.stringify(room))).toEqual(room);
    expect(parseRoom("not json")).toBeNull();
    expect(parseRoom(JSON.stringify({ version: 2 }))).toBeNull();
    const broken = parseRoom(JSON.stringify({ ...room, round: { stage: "nope" }, options: { clue: "?", timer: 7 } }));
    expect(broken?.round).toBeNull();
    expect(broken?.options).toEqual({ ...room.options, clue: "category" });
    // A category taken out of the list drops from the options, and a round dealt from it.
    const old = { ...room, options: { ...room.options, categories: ["food", "slang", "jobs"] } };
    expect(parseRoom(JSON.stringify(old))?.options.categories).toEqual(["food"]);
    expect(parseRoom(JSON.stringify({ ...room, round: { ...room.round, category: "slang" } }))?.round).toBeNull();
  });
});

describe("question pairs", () => {
  const all = PACKS.flatMap((p) => p.pairs);

  it("has 80+ pairs, every question once, in packs of 10 or more", () => {
    expect(all.length).toBeGreaterThanOrEqual(80);
    const questions = all.flatMap(([, a, b]) => [a, b].map((q) => q.toLowerCase()));
    expect(new Set(questions).size).toBe(questions.length);
    for (const p of PACKS) expect(p.pairs.length).toBeGreaterThanOrEqual(10);
    expect(new Set(PACKS.map((p) => p.id)).size).toBe(PACKS.length);
  });

  it("uses every answer kind, and keeps questions short enough for the card", () => {
    expect(new Set(all.map(([kind]) => kind))).toEqual(new Set(ANSWER_KINDS));
    for (const [kind, a, b] of all) {
      for (const q of [a, b]) {
        expect(q.length).toBeLessThanOrEqual(56);
        expect(q).toBe(q.trim());
        // Out of 10 reads "Rate your cooking"; the rest are questions.
        if (kind === "ten") expect(q).toMatch(/^Rate /);
        else expect(q).toMatch(/\?$/);
        if (kind === "point") expect(q).toMatch(/^Who/);
      }
    }
  });

  it("doesn't repeat a pair until its pack runs out, then starts it over", () => {
    const size = pack("food").pairs.length;
    let asked: string[] = [];
    const seen = new Set<string>();
    for (let i = 0; i < size; i++) {
      const drawn = drawQuestion(["food"], asked, null, rng);
      expect(seen.has(drawn.question.id)).toBe(false);
      seen.add(drawn.question.id);
      asked = drawn.asked;
    }
    const again = drawQuestion(["food"], asked, null, rng);
    expect(again.asked).toEqual([again.question.id]);
  });

  it("switches pack every round when there's a choice, and either question can be the crew's", () => {
    let last = null as PackId | null;
    let asked: string[] = [];
    let crewFirst = 0;
    for (let i = 0; i < 60; i++) {
      const { question, asked: next } = drawQuestion(["daily", "films", "travel"], asked, last, rng);
      expect(question.pack).not.toBe(last);
      const entry = pack(question.pack).pairs.find(([, a]) => a === question.id)!;
      expect(new Set([question.crew, question.odd])).toEqual(new Set([entry[1], entry[2]]));
      expect(question.kind).toBe(entry[0]);
      if (question.crew === entry[1]) crewFirst++;
      last = question.pack;
      asked = next;
    }
    expect(crewFirst).toBeGreaterThan(10);
    expect(crewFirst).toBeLessThan(50);
  });
});

describe("a Questions round", () => {
  const names = ["Riya", "Aman", "Kabir", "Zoya", "Dev"];
  const start = (patch: Partial<Room["options"]> = {}) =>
    run(roomWith(names, { mode: "questions", ...patch }), { type: "start", rng });

  it("deals one pair: the crew's question and the imposter's odd one", () => {
    const round = start().round!;
    expect(round.mode).toBe("questions");
    if (round.mode !== "questions") return;
    expect(round.question.crew).not.toBe(round.question.odd);
    expect(round.imposters).toHaveLength(1);
  });

  it("answers, reveals, then talks: the timer starts with the talking", () => {
    let room = dealAll(start(), 1000);
    expect(room.round?.stage).toBe("answer");
    expect(room.round?.timer).toBeNull();
    // The ledgers are booked once everyone has a card, as in Words mode.
    expect(Object.values(room.ledger).reduce((n, t) => n + t.taken, 0)).toBe(1);
    expect(reduce(room, { type: "start-talk", now: 0 })).toBe(room);
    room = reduce(room, { type: "show-question" });
    expect(room.round?.stage).toBe("reveal");
    room = reduce(room, { type: "start-talk", now: 5000 });
    expect(room.round?.stage).toBe("talk");
    expect(room.round?.timer).toEqual({ endsAt: 5000 + 180_000, left: 180_000 });
  });

  it("doesn't reopen cards while talking, since the real question is on screen", () => {
    const room = run(dealAll(start()), { type: "show-question" }, { type: "start-talk", now: 0 });
    expect(reduce(room, { type: "open", id: room.round!.seats[0] })).toBe(room);
  });

  it("has no guess: catching the imposter ends the round for the crew", () => {
    let room = run(dealAll(start()), { type: "show-question" }, { type: "start-talk", now: 0 }, { type: "vote" });
    const [imposter] = room.round!.imposters;
    room = reduce(room, { type: "accuse", ids: [imposter] });
    expect(room.round?.stage).toBe("result");
    expect(reduce(room, { type: "guess", correct: true })).toBe(room);
    for (const id of room.round!.seats) expect(room.scores[id] ?? 0).toBe(id === imposter ? 0 : 1);
  });

  it("gives an imposter who gets away 2", () => {
    let room = run(dealAll(start()), { type: "show-question" }, { type: "start-talk", now: 0 }, { type: "vote" });
    const innocent = room.round!.seats.find((id) => !room.round!.imposters.includes(id))!;
    room = reduce(room, { type: "accuse", ids: [innocent] });
    expect(room.scores).toEqual({ [room.round!.imposters[0]]: 2 });
  });

  it("re-deals a fresh pair in Questions mode, and the burned pair stays asked", () => {
    let room = start();
    const first = room.round!;
    room = run(room, { type: "look" }, { type: "open", id: first.seats[0] }, { type: "redeal", rng });
    const round = room.round!;
    if (round.mode !== "questions" || first.mode !== "questions") throw new Error("expected a Questions round");
    expect(round.question.id).not.toBe(first.question.id);
    expect(room.asked).toEqual([first.question.id, round.question.id]);
  });

  it("asks no pair twice in a room until its pack runs out", () => {
    let room = roomWith(names, { mode: "questions", packs: ["school"] });
    const ids: string[] = [];
    for (let i = 0; i < pack("school").pairs.length; i++) {
      room = run(room, { type: "lobby" }, { type: "start", rng });
      const round = room.round!;
      if (round.mode === "questions") ids.push(round.question.id);
    }
    expect(new Set(ids).size).toBe(pack("school").pairs.length);
  });

  it("needs at least one pack", () => {
    const room = roomWith(names, { mode: "questions", packs: [] });
    expect(startProblem(room)).toBe("Pick at least one pack.");
    // Words mode doesn't care about packs.
    expect(startProblem(reduce(room, { type: "options", patch: { mode: "words" } }))).toBeNull();
  });
});

describe("loading older saves", () => {
  it("loads a room saved before Questions mode as Words, with every pack on", () => {
    const room = dealAll(run(roomWith(["Riya", "Aman", "Kabir"]), { type: "start", rng }));
    const saved = JSON.parse(JSON.stringify(room));
    delete saved.options.mode;
    delete saved.options.packs;
    delete saved.asked;
    delete saved.lastPack;
    delete saved.round.mode;
    const loaded = parseRoom(JSON.stringify(saved));
    expect(loaded).toEqual(room);
    expect(loaded?.options.mode).toBe("words");
    expect(loaded?.options.packs).toEqual(PACK_IDS);
  });

  it("round-trips a Questions round and drops a broken one", () => {
    const room = run(roomWith(["Riya", "Aman", "Kabir"], { mode: "questions" }), { type: "start", rng });
    expect(parseRoom(JSON.stringify(room))).toEqual(room);
    const answered = dealAll(room);
    expect(parseRoom(JSON.stringify(answered))).toEqual(answered);
    const round = answered.round!;
    const broken = (patch: object) => parseRoom(JSON.stringify({ ...answered, round: { ...round, ...patch } }))?.round;
    expect(broken({ stage: "guess" })).toBeNull();
    expect(broken({ question: { id: "x", pack: "nope", kind: "number", crew: "a", odd: "b" } })).toBeNull();
    expect(broken({ question: undefined })).toBeNull();
    // A Words round can't be in a Questions stage.
    const words = dealAll(run(roomWith(["Riya", "Aman", "Kabir"]), { type: "start", rng }));
    expect(parseRoom(JSON.stringify({ ...words, round: { ...words.round, stage: "reveal" } }))?.round).toBeNull();
  });
});
