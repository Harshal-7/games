import { describe, expect, it } from "vitest";

import { hash, MIX } from "./card";
import { EDITIONS } from "./code";
import { HIGHWAY_V1, MAX_LABEL, TIERS } from "./sights";

/** Words, counting hyphenated ones ("Nimbu-mirchi") as two. */
const words = (label: string) => label.split(/[\s-]+/).length;

describe("sights", () => {
  it("has 60+ Highway sights, with plenty of each tier for cards to feel different", () => {
    expect(HIGHWAY_V1.length).toBeGreaterThanOrEqual(60);
    for (const tier of TIERS) {
      const count = HIGHWAY_V1.filter((s) => s.tier === tier).length;
      expect(count, tier).toBeGreaterThanOrEqual(MIX[5][tier] * 2.5);
    }
  });

  it("never repeats an id, a label or an emoji in a list", () => {
    for (const { sights } of EDITIONS) {
      for (const key of ["id", "label", "emoji"] as const) {
        const values = sights.map((s) => (key === "label" ? s.label.toLowerCase() : s[key]));
        expect(new Set(values).size, key).toBe(values.length);
      }
    }
  });

  it("keeps every label 2–4 words and short enough for a square", () => {
    for (const { sights } of EDITIONS) {
      for (const { label, id, emoji } of sights) {
        expect(words(label), label).toBeGreaterThanOrEqual(2);
        expect(words(label), label).toBeLessThanOrEqual(4);
        expect(label.length, label).toBeLessThanOrEqual(MAX_LABEL);
        expect(label, label).toBe(label.trim());
        expect(label[0], label).toBe(label[0].toUpperCase());
        expect(id, id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
        expect(emoji.length, id).toBeGreaterThan(0);
      }
    }
  });

  it("keeps shipped lists frozen: add a new version instead of editing one", () => {
    // If this fails you changed HIGHWAY_V1, which changes every card for every code.
    // Put it back and add HIGHWAY_V2 (with its own code words) instead.
    expect(Object.isFrozen(HIGHWAY_V1)).toBe(true);
    expect(HIGHWAY_V1.length).toBe(76);
    expect(hash(JSON.stringify(HIGHWAY_V1))).toBe(PINNED_HIGHWAY_V1);
  });
});

const PINNED_HIGHWAY_V1 = 2766241024;
