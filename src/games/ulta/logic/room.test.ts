import { describe, expect, it } from "vitest";

import type { Player } from "@/party/logic/players";
import { seeded } from "@/party/logic/random";

import {
  GUESS_MS,
  LISTENS,
  newRoom,
  parseRoom,
  reduce,
  startProblem,
  teamPlayers,
  winner,
  type Action,
  type Room,
  type TeamId,
} from "./room";

const people = (n: number): Player[] => Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, name: `Player ${i + 1}` }));
const run = (room: Room, ...actions: Action[]) => actions.reduce(reduce, room);
const NOW = 1_000_000;

/** A started game with `n` players. */
function started(n: number, seed = 1, target = 7): Room {
  return reduce(newRoom(people(n), { target, sound: true }), { type: "start", rng: seeded(seed) });
}

/** Plays the current turn from the song pick to the reveal, ending how `end` says. */
function playTurn(room: Room, end: "guessed" | "stolen" | "not-stolen" | "missed"): Room {
  let r = run(room, { type: "own-song" }, { type: "sung" }, { type: "listen" }, { type: "copied", now: NOW });
  if (end === "guessed") return reduce(r, { type: "guessed", now: NOW + 10_000 });
  r = reduce(r, { type: "missed", now: NOW + 10_000 });
  if (end === "stolen") return reduce(r, { type: "stolen" });
  if (end === "not-stolen") return reduce(r, { type: "not-stolen" });
  return r;
}
const next = (room: Room) => reduce(room, { type: "next" });

describe("teams", () => {
  it("puts new players on the smaller team", () => {
    const room = newRoom(people(5));
    expect(teamPlayers(room, "a").length).toBe(3);
    expect(teamPlayers(room, "b").length).toBe(2);
    const more = reduce(room, { type: "add-player", id: "p6", name: "Asha" });
    expect(more.teams.p6).toBe("b");
  });

  it("moves a player across, and shuffles into even teams", () => {
    const room = newRoom(people(6));
    const moved = reduce(room, { type: "move-player", id: "p1" });
    expect(moved.teams.p1).not.toBe(room.teams.p1);
    for (let seed = 1; seed < 20; seed++) {
      const shuffled = reduce(moved, { type: "shuffle-teams", rng: seeded(seed) });
      expect(teamPlayers(shuffled, "a").length).toBe(3);
      expect(teamPlayers(shuffled, "b").length).toBe(3);
    }
  });

  it("forgets a player who leaves", () => {
    const room = reduce(newRoom(people(4)), { type: "remove-player", id: "p2" });
    expect(Object.keys(room.teams).sort()).toEqual(["p1", "p3", "p4"]);
  });

  it("needs 2 players a team, and 2 to play at all", () => {
    expect(startProblem(newRoom(people(1)))).toMatch(/Add 1 more player/);
    expect(startProblem(newRoom(people(2)))).toBeNull();
    expect(startProblem(newRoom(people(3)))).toBeNull();
    const lopsided = run(newRoom(people(4)), { type: "move-player", id: "p2" });
    expect(startProblem(lopsided)).toMatch(/needs 2 players/);
  });

  it("can't change who's playing mid-game, only names", () => {
    const room = started(4);
    expect(reduce(room, { type: "remove-player", id: "p1" })).toBe(room);
    expect(reduce(room, { type: "move-player", id: "p1" })).toBe(room);
    expect(reduce(room, { type: "add-player", id: "x", name: "Ravi" })).toBe(room);
    expect(reduce(room, { type: "rename-player", id: "p1", name: "Ravi" }).players[0].name).toBe("Ravi");
  });
});

describe("turn order", () => {
  it("alternates teams, and the copier is always a teammate who isn't singing", () => {
    let room = started(5);
    const first = room.game!.turn.team!;
    for (let i = 0; i < 20; i++) {
      const turn = room.game!.turn;
      expect(turn.team).toBe(i % 2 === 0 ? first : first === "a" ? "b" : "a");
      expect(turn.singer).not.toBe(turn.copier);
      expect(room.teams[turn.singer]).toBe(turn.team);
      expect(room.teams[turn.copier]).toBe(turn.team);
      room = next(playTurn(room, "not-stolen"));
    }
  });

  it("gives everyone on a team the same number of turns singing and copying", () => {
    let room = started(5, 3, 99);
    const sang: Record<string, number> = {};
    const copied: Record<string, number> = {};
    // 12 turns: 6 each, so the team of 3 and the team of 2 both go round evenly.
    for (let i = 0; i < 12; i++) {
      const { singer, copier } = room.game!.turn;
      sang[singer] = (sang[singer] ?? 0) + 1;
      copied[copier] = (copied[copier] ?? 0) + 1;
      room = next(playTurn(room, "not-stolen"));
    }
    for (const team of ["a", "b"] as TeamId[]) {
      const ids = teamPlayers(room, team).map((p) => p.id);
      const counts = ids.map((id) => sang[id] ?? 0);
      expect(Math.max(...counts) - Math.min(...counts), `${team} singing`).toBe(0);
      const copies = ids.map((id) => copied[id] ?? 0);
      expect(Math.max(...copies) - Math.min(...copies), `${team} copying`).toBe(0);
    }
  });

  it("goes round everyone when 2 or 3 play for fun, with no score and no steal", () => {
    for (const n of [2, 3]) {
      let room = started(n);
      expect(room.game!.mode).toBe("fun");
      const singers: string[] = [];
      for (let i = 0; i < n * 2; i++) {
        const turn = room.game!.turn;
        expect(turn.team).toBeNull();
        expect(turn.singer).not.toBe(turn.copier);
        singers.push(turn.singer);
        room = run(room, { type: "own-song" }, { type: "sung" }, { type: "copied", now: NOW }, { type: "missed", now: NOW });
        expect(room.game!.turn.stage).toBe("reveal");
        expect(room.game!.turn.result).toBe("missed");
        room = next(room);
      }
      for (const p of room.players) expect(singers.filter((s) => s === p.id).length).toBe(2);
      expect(room.game!.scores).toEqual({ a: 0, b: 0 });
    }
  });

  it("starts with a random team and singer", () => {
    const firsts = new Set<string>();
    for (let seed = 1; seed < 40; seed++) {
      const turn = started(6, seed).game!.turn;
      firsts.add(`${turn.team}:${turn.singer}`);
    }
    expect(firsts.size).toBeGreaterThan(4);
  });
});

describe("a turn", () => {
  it("goes pick, sing, copy, guess, reveal", () => {
    let room = started(4);
    expect(room.game!.turn.stage).toBe("pick");
    room = reduce(room, { type: "sing" });
    expect(room.game!.turn.stage).toBe("pick"); // no song yet: Sing needs one
    room = run(room, { type: "suggest", rng: seeded(2) }, { type: "open-song" }, { type: "open-song" });
    expect(room.game!.turn.song).not.toBeNull();
    expect(room.game!.turn.opens).toBe(2);
    expect(room.used).toHaveLength(1);
    room = run(room, { type: "sing" }, { type: "sung" });
    expect(room.game!.turn.stage).toBe("copy");
    room = run(room, { type: "copied", now: NOW });
    expect(room.game!.turn.stage).toBe("guess");
    expect(room.game!.turn.guess).toEqual({ endsAt: NOW + GUESS_MS, left: GUESS_MS });
  });

  it("gives the copier 3 listens, no more", () => {
    let room = run(started(4), { type: "own-song" }, { type: "sung" });
    for (let i = 0; i < 5; i++) room = reduce(room, { type: "listen" });
    expect(room.game!.turn.listens).toBe(LISTENS);
  });

  it("another suggestion replaces the song and seals the card again", () => {
    let room = run(started(4), { type: "suggest", rng: seeded(1) }, { type: "open-song" });
    const first = room.game!.turn.song;
    room = reduce(room, { type: "suggest", rng: seeded(9) });
    expect(room.game!.turn.song).not.toEqual(first);
    expect(room.game!.turn.opens).toBe(0);
    expect(room.used).toHaveLength(2);
  });
});

describe("points and steals", () => {
  it("a guess scores for the singing team", () => {
    const room = playTurn(started(4), "guessed");
    const team = room.game!.turn.team!;
    expect(room.game!.scores[team]).toBe(1);
    expect(room.game!.turn).toMatchObject({ stage: "reveal", result: "guessed" });
  });

  it("a miss goes to the other team to steal; a steal scores for them", () => {
    const missed = playTurn(started(4), "missed");
    expect(missed.game!.turn.stage).toBe("steal");
    const stolen = reduce(missed, { type: "stolen" });
    const team = stolen.game!.turn.team!;
    expect(stolen.game!.scores[team]).toBe(0);
    expect(stolen.game!.scores[team === "a" ? "b" : "a"]).toBe(1);
    expect(stolen.game!.turn.result).toBe("stolen");
  });

  it("a failed steal scores for nobody", () => {
    const room = playTurn(started(4), "not-stolen");
    expect(room.game!.scores).toEqual({ a: 0, b: 0 });
    expect(room.game!.turn.result).toBe("missed");
  });

  it("can't call it guessed once the time has run out, until +30 sec", () => {
    let room = run(started(4), { type: "own-song" }, { type: "sung" }, { type: "copied", now: NOW });
    const late = NOW + GUESS_MS + 1;
    expect(reduce(room, { type: "guessed", now: late })).toBe(room);
    room = reduce(room, { type: "timer", op: "add", now: late });
    expect(reduce(room, { type: "guessed", now: late + 1000 }).game!.turn.result).toBe("guessed");
  });

  it("ends the game once a team reaches the target, after the reveal", () => {
    let room = started(4, 1, 5);
    let guard = 0;
    while (!room.game!.over && guard++ < 50) {
      room = playTurn(room, "guessed");
      if (!room.game!.over) room = next(room);
    }
    const game = room.game!;
    expect(game.over).toBe(true);
    const won = winner(game, 5)!;
    expect(game.scores[won]).toBe(5);
    expect(game.scores[won === "a" ? "b" : "a"]).toBe(4);
    // Nothing moves a finished game but a new one.
    expect(reduce(room, { type: "own-song" })).toBe(room);
    const again = reduce(room, { type: "start", rng: seeded(2) });
    expect(again.game!.over).toBe(false);
    expect(again.game!.scores).toEqual({ a: 0, b: 0 });
  });
});

describe("lost recordings", () => {
  it("send a turn back to singing while one is still needed", () => {
    const copying = run(started(4), { type: "own-song" }, { type: "sung" }, { type: "listen" });
    const back = reduce(copying, { type: "lost" });
    expect(back.game!.turn).toMatchObject({ stage: "sing", listens: 0 });
    const guessing = reduce(copying, { type: "copied", now: NOW });
    expect(reduce(guessing, { type: "lost" }).game!.turn.stage).toBe("sing");
  });

  it("leave a steal or a reveal alone", () => {
    const steal = playTurn(started(4), "missed");
    expect(reduce(steal, { type: "lost" })).toBe(steal);
    const reveal = playTurn(started(4), "guessed");
    expect(reduce(reveal, { type: "lost" })).toBe(reveal);
  });
});

describe("leaving and starting over", () => {
  it("the lobby keeps players, teams and options; a new room keeps them too", () => {
    const room = run(started(4), { type: "options", patch: { target: 10 } });
    const lobby = reduce(room, { type: "lobby" });
    expect(lobby.game).toBeNull();
    expect(lobby.players).toBe(room.players);
    expect(lobby.teams).toEqual(room.teams);
    expect(lobby.options.target).toBe(10);
    const fresh = reduce(room, { type: "new-room" });
    expect(fresh.teams).toEqual(room.teams);
    expect(fresh.used).toEqual([]);
  });
});

describe("saves", () => {
  it("come back the same", () => {
    const room = run(started(5), { type: "suggest", rng: seeded(3) }, { type: "sing" });
    expect(parseRoom(JSON.stringify(room))).toEqual(room);
  });

  it("start fresh from nonsense, and drop a game that doesn't fit the players", () => {
    expect(parseRoom(null)).toBeNull();
    expect(parseRoom("{")).toBeNull();
    expect(parseRoom(JSON.stringify({ version: 2 }))).toBeNull();
    const room = started(4);
    const broken = { ...room, game: { ...room.game, turn: { ...room.game!.turn, singer: "ghost" } } };
    const parsed = parseRoom(JSON.stringify(broken))!;
    expect(parsed.game).toBeNull();
    expect(parsed.players).toEqual(room.players);
  });

  it("fix odd options and fill in missing teams", () => {
    const parsed = parseRoom(JSON.stringify({ version: 1, players: people(4), options: { target: 3 } }))!;
    expect(parsed.options).toEqual({ target: 7, sound: true });
    expect(Object.keys(parsed.teams)).toHaveLength(4);
  });
});
