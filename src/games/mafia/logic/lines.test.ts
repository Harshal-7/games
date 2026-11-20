import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { seeded } from "@/party/logic/random";

import { newRoom, reduce, TALK_MINUTES, type Action, type Room } from "./game";
import { CLIP_DIR, clipFile, dayLine, FIXED_LINES } from "./lines";
import { narration } from "./narration";

const clips = () => readdirSync(fileURLToPath(new URL(`../../../../public${CLIP_DIR}`, import.meta.url)));

describe("the recorded narrator", () => {
  it("has a clip for every line without a name, and no clips left over", () => {
    expect([...clips()].sort()).toEqual(FIXED_LINES.map(clipFile).sort());
    expect(new Set(FIXED_LINES.map(clipFile)).size).toBe(FIXED_LINES.length);
  });

  it("covers every talk time", () => {
    for (const m of TALK_MINUTES) expect(FIXED_LINES).toContain(dayLine(m));
  });

  it("records every line of a game except the ones that name a player", () => {
    const rng = seeded(3);
    let room: Room = reduce(newRoom(), { type: "quick-players", count: 7, rng });
    room = reduce(room, { type: "start", rng });
    const names = room.players.map((p) => p.name);
    const heard: string[] = [];
    const listen = () => heard.push(...(narration(room)?.lines ?? []));
    const run = (...actions: Action[]) => {
      for (const action of actions) {
        room = reduce(room, action);
        listen();
      }
    };
    while (room.game?.stage === "deal") {
      const id = room.game.seats[room.game.turn];
      run({ type: "look" }, { type: "open", id }, { type: "done" });
    }
    // Play nights and days until someone wins, every role picking the first name it can.
    for (let t = 0, guard = 0; room.game && room.game.stage !== "end" && guard < 20_000; guard++, t += 250) {
      const g = room.game;
      if (g.stage === "night") {
        const n = g.night!;
        if (n.step === "ready") run({ type: "nightfall", now: t });
        else if (n.phase === "open" && n.doneAt === null && n.step !== "dusk") {
          const pick = g.seats.find((id) => reduce(room, { type: "pick", id, now: t }) !== room);
          if (pick) run({ type: "pick", id: pick, now: t });
        }
        run({ type: "tick", now: t, rng });
      } else if (g.stage === "morning") run({ type: "finish" }, { type: "day", now: t });
      else if (g.stage === "day") run({ type: "vote" });
      else if (g.stage === "vote") run({ type: "vote-out", id: null });
      else if (g.stage === "verdict") run({ type: "finish" }, { type: "nightfall", now: t });
    }
    expect(room.game?.stage).toBe("end");
    const unrecorded = [...new Set(heard)].filter((line) => !FIXED_LINES.includes(line));
    for (const line of unrecorded) expect(names.some((name) => line.includes(name))).toBe(true);
    expect(heard.filter((line) => FIXED_LINES.includes(line)).length).toBeGreaterThan(10);
  });
});
