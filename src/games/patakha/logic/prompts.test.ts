import { describe, expect, it } from "vitest";

import { seeded } from "@/party/logic/random";

import { drawPrompt, MAX_PROMPT, PACK_IDS, PACKS } from "./prompts";

const ALL = PACKS.flatMap((p) => p.prompts);

describe("prompts", () => {
  it("has 120+ prompts in four packs of 30 or more", () => {
    expect(ALL.length).toBeGreaterThanOrEqual(120);
    expect(PACK_IDS).toEqual(["desi", "screen", "letters", "everyday"]);
    for (const p of PACKS) expect(p.prompts.length, p.label).toBeGreaterThanOrEqual(30);
  });

  it("never repeats a prompt, in any pack or any case", () => {
    const seen = new Set<string>();
    for (const prompt of ALL) {
      const key = prompt.toLowerCase();
      expect(seen.has(key), prompt).toBe(false);
      seen.add(key);
    }
  });

  it("keeps every prompt short and tidy enough for big type on a phone", () => {
    for (const prompt of ALL) {
      expect(prompt.length, prompt).toBeLessThanOrEqual(MAX_PROMPT);
      expect(prompt, prompt).toBe(prompt.trim());
      expect(prompt, prompt).not.toMatch(/\s{2}|[.!?]$/);
      // Lower case first, so "Rohan · a Shah Rukh film" reads as one line.
      expect(prompt[0], prompt).toBe(prompt[0].toLowerCase());
    }
  });

  it("doesn't repeat a prompt until the packs run out, then starts over", () => {
    const rng = seeded(7);
    const pool = PACKS[1].prompts;
    let used: string[] = [];
    const firstLap = new Set<string>();
    for (let i = 0; i < pool.length; i++) {
      const drawn = drawPrompt(["screen"], used, rng);
      expect(firstLap.has(drawn.prompt)).toBe(false);
      firstLap.add(drawn.prompt);
      used = drawn.used;
    }
    expect(firstLap.size).toBe(pool.length);
    // The pack has run out: the next draw starts it over, but not with the prompt just played.
    const last = used[used.length - 1];
    const again = drawPrompt(["screen"], used, rng);
    expect(again.prompt).not.toBe(last);
    expect(again.used).toEqual([again.prompt]);
  });

  it("only draws from the packs that are on, and keeps other packs' history", () => {
    const rng = seeded(3);
    const desi = new Set(PACKS[0].prompts);
    let used = ["a Shah Rukh film"];
    for (let i = 0; i < 50; i++) {
      const drawn = drawPrompt(["desi"], used, rng);
      expect(desi.has(drawn.prompt)).toBe(true);
      used = drawn.used;
    }
    expect(used).toContain("a Shah Rukh film");
  });
});
