import { describe, expect, it } from "vitest";

import { seeded } from "@/party/logic/random";

import { newRoom, reduce, type Action, type Room } from "./room";
import { category } from "./words";
import { SAVED_ROOM_SCRIPT, savedGame, savedGameLine } from "./saved";

const run = (room: Room, ...actions: Action[]) => actions.reduce(reduce, room);
const fivePlayers = () => run(newRoom(), { type: "quick-players", count: 5, rng: seeded(3) });

describe("savedGame", () => {
  it("has nothing to show for an empty room", () => {
    expect(savedGame(newRoom())).toBeNull();
  });

  it("describes a room before, during and after a round", () => {
    const ready = fivePlayers();
    expect(savedGameLine(savedGame(ready)!)).toBe("5 players · not started");

    const playing = run(ready, { type: "start", rng: seeded(7) });
    expect(savedGame(playing)).toEqual({ players: 5, round: 1, inRound: true });
    expect(savedGameLine(savedGame(playing)!)).toBe("Round 1 · 5 players");

    // Stopping a round doesn't count it.
    expect(savedGameLine(savedGame(run(playing, { type: "lobby" }))!)).toBe("5 players · not started");
    // Between rounds after three finished ones.
    expect(savedGameLine(savedGame({ ...ready, played: 3 })!)).toBe("After round 3 · 5 players");
  });

  it("never gives away the word, hint, category or the imposters", () => {
    const playing = run(fivePlayers(), { type: "start", rng: seeded(7) });
    const round = playing.round!;
    const shown = JSON.stringify(savedGame(playing)) + savedGameLine(savedGame(playing)!);
    const names = Object.fromEntries(playing.players.map((p) => [p.id, p.name]));
    for (const secret of [round.word, round.hint, category(round.category).label, ...round.imposters, ...round.imposters.map((id) => names[id])]) {
      expect(shown).not.toContain(secret);
    }
  });
});

describe("saved-room head script", () => {
  function marks(saved: string | null): boolean {
    let marked = false;
    const document = { documentElement: { setAttribute: () => (marked = true) } };
    new Function("document", "localStorage", SAVED_ROOM_SCRIPT)(document, { getItem: () => saved });
    return marked;
  }

  it("marks the page only when a saved room has players", () => {
    expect(marks(null)).toBe(false);
    expect(marks("not json {")).toBe(false);
    expect(marks(JSON.stringify(newRoom()))).toBe(false);
    expect(marks(JSON.stringify(fivePlayers()))).toBe(true);
  });
});
