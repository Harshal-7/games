import { describe, expect, it } from "vitest";

import { seeded } from "@/party/logic/random";

import {
  callLine,
  dayLine,
  dayLogLine,
  listNames,
  morningLines,
  nightLogLine,
  NIGHTS,
  nightScript,
  outLines,
  pickStory,
  STORIES,
  tell,
} from "./script";

describe("morning stories", () => {
  it("has 30+ stories, no duplicates, each with a {name} slot and short enough to read at a glance", () => {
    expect(STORIES.length).toBeGreaterThanOrEqual(30);
    expect(new Set(STORIES.map((s) => s.toLowerCase())).size).toBe(STORIES.length);
    for (const story of STORIES) {
      expect(story).toContain("{name}");
      expect(story.replaceAll("{name}", "").match(/[{}]/)).toBeNull();
      expect(story.length).toBeLessThanOrEqual(100);
      expect(story).toMatch(/[.!?"]$/);
    }
  });

  it("keeps it light: nothing gory", () => {
    const words = /\b(blood|kill|killed|murder|dead|stab|shot|gun|knife|body|corpse)\b/i;
    for (const story of STORIES) expect(story).not.toMatch(words);
  });

  it("fills in every {name}", () => {
    expect(tell("{name} went up to the terrace. The Mafia were looking at {name}.", "Riya")).toBe(
      "Riya went up to the terrace. The Mafia were looking at Riya.",
    );
  });

  it("tells each story once before starting over", () => {
    const rng = seeded(9);
    let told: string[] = [];
    for (let i = 0; i < STORIES.length; i++) {
      const next = pickStory(told, rng);
      expect(told).not.toContain(next.story);
      told = next.told;
    }
    expect(new Set(told).size).toBe(STORIES.length);
    expect(pickStory(told, rng).told).toHaveLength(1);
    // A story that's since been taken out of the list doesn't block anything.
    expect(pickStory(["An old story about {name}."], rng).told).toHaveLength(1);
  });
});

describe("the narrator", () => {
  it("calls each role to open and close their eyes", () => {
    expect(callLine("mafia", "open")).toBe("Mafia, open your eyes and pick someone.");
    expect(callLine("doctor", "open")).toBe("Doctor, open your eyes. Who do you want to save?");
    expect(callLine("police", "open")).toBe("Police, open your eyes. Who do you want to check?");
    expect(callLine("police", "close")).toBe("Police, close your eyes.");
  });

  it("tells the morning, the day and the vote", () => {
    expect(morningLines(null)).toEqual(["Everyone, wake up.", "Nobody died last night."]);
    expect(morningLines({ name: "Rohan", role: "villager", story: STORIES[0] })).toEqual([
      "Everyone, wake up.",
      "Rohan went out for chai at 3 a.m. and never came back.",
      "Rohan was a Villager.",
    ]);
    expect(outLines("Priya", "mafia")).toEqual(["Priya is out.", "Priya was Mafia."]);
    expect(outLines("Dev", "doctor")[1]).toBe("Dev was the Doctor.");
    expect(dayLine(3)).toContain("You have 3 minutes.");
    expect(listNames(["Riya", "Aman", "Dev"])).toBe("Riya, Aman and Dev");
  });
});

describe("the night log", () => {
  const name = (id: string) => ({ r: "Rohan", p: "Priya", a: "Aman" })[id] ?? id;
  const isMafia = (id: string) => id === "p";

  it("tells each night like the brief's example", () => {
    const night = { round: 1, kill: "r", save: "r", check: "p", died: null };
    expect(nightLogLine(night, name, isMafia, { doctor: true, police: true })).toBe(
      "Night 1: the Mafia went for Rohan, the Doctor saved Rohan and the Police checked Priya (Mafia). Nobody was out.",
    );
  });

  it("covers a Doctor or Police who is out, and leaves out roles not in the game", () => {
    const night = { round: 3, kill: "a", save: null, check: null, died: "a" };
    expect(nightLogLine(night, name, isMafia, { doctor: true, police: true })).toBe(
      "Night 3: the Mafia went for Aman, nobody was saved and nobody was checked. Aman was out.",
    );
    expect(nightLogLine(night, name, isMafia, { doctor: false, police: false })).toBe(
      "Night 3: the Mafia went for Aman. Aman was out.",
    );
  });

  it("tells each day", () => {
    expect(dayLogLine(2, { name: "Aman", role: "villager" })).toBe("Day 2: Aman was voted out (Villager).");
    expect(dayLogLine(1, null)).toBe("Day 1: a tie, nobody was out.");
  });
});

describe("the nights' scenes", () => {
  it("has a few scenes, each calling every role to open their eyes by name", () => {
    expect(NIGHTS.length).toBeGreaterThanOrEqual(3);
    for (const night of NIGHTS) {
      expect(night.dusk).toMatch(/close your eyes\.$/);
      expect(night.dawn).toMatch(/wake up\.$/);
      for (const role of ["mafia", "doctor", "police"] as const) {
        expect(night.open[role]).toMatch(new RegExp(`^${role === "mafia" ? "Mafia" : role === "doctor" ? "Doctor" : "Police"}, open your eyes`));
      }
      for (const line of [night.dusk, night.dawn, ...Object.values(night.open)]) expect(line.length).toBeLessThanOrEqual(90);
    }
    expect(new Set(NIGHTS.map((n) => n.dusk)).size).toBe(NIGHTS.length);
  });

  it("moves on to a new scene every night, and starts each game somewhere new", () => {
    expect(nightScript(1, 1)).toBe(NIGHTS[0]);
    expect(nightScript(1, 2)).not.toBe(nightScript(1, 1));
    expect(nightScript(2, 1)).not.toBe(nightScript(1, 1));
    expect(callLine("police", "close", NIGHTS[2])).toBe("Police, close your eyes.");
  });
});
