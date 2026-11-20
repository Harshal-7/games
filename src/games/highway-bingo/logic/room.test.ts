import { describe, expect, it } from "vitest";

import { seeded } from "@/party/logic/random";

import { readCode } from "./code";
import { MAX_SAVED, marksOf, newRoom, parseRoom, reduce, standings, underway, type Action, type Room } from "./room";

const play = (actions: Action[], room: Room = newRoom()) => actions.reduce(reduce, room);

describe("starting and joining", () => {
  it("starts an own-phones game as seat 1, showing the code, in the size picked", () => {
    const room = play([
      { type: "options", patch: { size: 4 } },
      { type: "start", mode: "own", rng: seeded(1) },
    ]);
    const game = room.game!;
    expect(game.mode).toBe("own");
    expect(game.seats).toEqual([1]);
    expect(game.sharing).toBe(true);
    const read = readCode(game.code);
    expect(read.ok && read.code.size).toBe(4);
  });

  it("starts left against right as two seats, and one card together as one", () => {
    expect(play([{ type: "start", mode: "sides", rng: seeded(2) }]).game).toMatchObject({ seats: [1, 2], sharing: false });
    expect(play([{ type: "start", mode: "together", rng: seeded(3) }]).game).toMatchObject({ seats: [1], sharing: false });
  });

  it("joins with any typed form of a code and a seat, and refuses ones it can't use", () => {
    expect(play([{ type: "join", code: "chai 42", seat: 3 }]).game).toMatchObject({ code: "CHAI-42", seats: [3], mode: "own" });
    expect(play([{ type: "join", code: "ZEBRA-42", seat: 3 }]).game).toBeNull();
    expect(play([{ type: "join", code: "CHAI-42", seat: 0 }]).game).toBeNull();
    expect(play([{ type: "join", code: "CHAI-42", seat: 21 }]).game).toBeNull();
    expect(play([{ type: "join", code: "CHAI-42", seat: 2.5 }]).game).toBeNull();
  });
});

describe("marks", () => {
  it("toggles a square, but never the free middle or a square off the card", () => {
    let room = play([
      { type: "join", code: "CHAI-42", seat: 2 },
      { type: "mark", seat: 2, cell: 7 },
      { type: "mark", seat: 2, cell: 3 },
    ]);
    expect(marksOf(room, "CHAI-42", 2)).toEqual([3, 7]);
    room = play(
      [
        { type: "mark", seat: 2, cell: 7 },
        { type: "mark", seat: 2, cell: 12 },
        { type: "mark", seat: 2, cell: 25 },
        { type: "mark", seat: 1, cell: 4 },
      ],
      room,
    );
    expect(marksOf(room, "CHAI-42", 2)).toEqual([3]);
    expect(marksOf(room, "CHAI-42", 1)).toEqual([]);
  });

  it("keeps marks per code and seat, so joining the same seat again brings them back", () => {
    let room = play([
      { type: "join", code: "CHAI-42", seat: 2 },
      { type: "mark", seat: 2, cell: 0 },
      { type: "end" },
      { type: "join", code: "CHAI-42", seat: 3 },
    ]);
    expect(marksOf(room, "CHAI-42", 3)).toEqual([]);
    room = play([{ type: "join", code: "chai-42", seat: 2 }], room);
    expect(marksOf(room, room.game!.code, 2)).toEqual([0]);
  });

  it("marks each side's card on its own when it's left against right", () => {
    const start = play([{ type: "start", mode: "sides", rng: seeded(4) }]);
    const code = start.game!.code;
    const room = play([{ type: "mark", seat: 1, cell: 0 }, { type: "mark", seat: 2, cell: 1 }], start);
    expect(marksOf(room, code, 1)).toEqual([0]);
    expect(marksOf(room, code, 2)).toEqual([1]);
  });

  it("forgets the oldest cards once it keeps more than it needs", () => {
    let room = newRoom();
    for (let seat = 1; seat <= 20; seat++) {
      room = play([{ type: "join", code: "CHAI-42", seat }, { type: "mark", seat, cell: 0 }], room);
      room = play([{ type: "join", code: "DOSA-42", seat }, { type: "mark", seat, cell: 0 }], room);
    }
    expect(room.cards).toHaveLength(MAX_SAVED);
    expect(room.cards[0]).toMatchObject({ code: "DOSA-42", seat: 20 });
    expect(marksOf(room, "CHAI-42", 1)).toEqual([]);
  });
});

describe("winning", () => {
  it("wins with a full line, takes it back if a square is unmarked, and plays on to a full card", () => {
    let room = play([
      { type: "join", code: "CHAI-42", seat: 1 },
      ...[10, 11, 13].map((cell): Action => ({ type: "mark", seat: 1, cell })),
    ]);
    expect(standings(room)[0]).toMatchObject({ won: false, progress: { toGo: 1 } });
    room = play([{ type: "mark", seat: 1, cell: 14 }], room);
    expect(standings(room)[0].won).toBe(true);
    expect(standings(room)[0].progress.done).toEqual([[10, 11, 12, 13, 14]]);
    expect(standings(play([{ type: "mark", seat: 1, cell: 14 }], room))[0].won).toBe(false);

    room = play([{ type: "play-on" }], room);
    expect(standings(room)[0].won).toBe(false);
    const rest = [...Array(25).keys()].filter((c) => ![10, 11, 12, 13, 14].includes(c));
    room = play(rest.map((cell): Action => ({ type: "mark", seat: 1, cell })), room);
    expect(standings(room)[0]).toMatchObject({ won: true, progress: { full: true } });
  });

  it("asks before leaving only once a square is marked", () => {
    const room = play([{ type: "join", code: "CHAI-42", seat: 1 }]);
    expect(underway(room)).toBe(false);
    expect(underway(play([{ type: "mark", seat: 1, cell: 0 }], room))).toBe(true);
    expect(underway(newRoom())).toBe(false);
  });
});

describe("parseRoom", () => {
  it("round-trips a saved room", () => {
    const room = play([
      { type: "start", mode: "sides", rng: seeded(5) },
      { type: "mark", seat: 2, cell: 6 },
      { type: "side", side: 1 },
      { type: "options", patch: { sound: false } },
    ]);
    expect(parseRoom(JSON.stringify(room))).toEqual(room);
  });

  it("gives null for nothing, junk or another version", () => {
    expect(parseRoom(null)).toBeNull();
    expect(parseRoom("{oops")).toBeNull();
    expect(parseRoom("[]")).toBeNull();
    expect(parseRoom(JSON.stringify({ version: 2 }))).toBeNull();
  });

  it("drops the parts it can't use and keeps the rest", () => {
    const room = parseRoom(
      JSON.stringify({
        version: 1,
        options: { size: 6, sound: "yes", awake: false },
        game: { code: "chai-42", mode: "own", seats: [3], goal: "full", sharing: true, side: 9 },
        cards: [
          { code: "CHAI-42", seat: 3, marks: [4, 4, 12, 99, -1, 1.5, "2", 0] },
          { code: "ZEBRA-10", seat: 1, marks: [] },
          { code: "CHAI-42", seat: 50, marks: [] },
          "junk",
        ],
      }),
    )!;
    expect(room.options).toEqual({ size: 5, sound: true, awake: false });
    expect(room.game).toEqual({ code: "CHAI-42", mode: "own", seats: [3], goal: "full", sharing: true, side: 0 });
    expect(room.cards).toEqual([{ code: "CHAI-42", seat: 3, marks: [0, 4] }]);
    // A game whose code this copy can't read is dropped, not shown broken.
    expect(parseRoom(JSON.stringify({ version: 1, game: { code: "ZEBRA-42", mode: "own", seats: [1] } }))!.game).toBeNull();
  });
});
