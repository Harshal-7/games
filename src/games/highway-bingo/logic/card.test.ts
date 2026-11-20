import { describe, expect, it } from "vitest";

import { seeded } from "@/party/logic/random";

import { deal, freeCell, lines, MAX_SEAT, MIN_SEAT, MIX, progress, type Card } from "./card";
import { newCode, readCode, type Code } from "./code";
import { TIERS } from "./sights";

function code(text: string): Code {
  const read = readCode(text);
  if (!read.ok) throw new Error(`bad code ${text}`);
  return read.code;
}

const ids = (card: Card) => card.cells.map((c) => c?.id ?? "FREE");

/** A spread of codes, both sizes. */
const CODES = (() => {
  const rng = seeded(2024);
  return Array.from({ length: 40 }, (_, i) => code(newCode("highway", i % 2 ? 4 : 5, rng)));
})();

describe("deal", () => {
  it("gives the same card for the same code and seat, on any phone", () => {
    for (const c of CODES) {
      for (let seat = MIN_SEAT; seat <= MAX_SEAT; seat++) {
        // A second phone reads the code from scratch.
        expect(ids(deal(code(c.text.toLowerCase()), seat))).toEqual(ids(deal(c, seat)));
      }
    }
  });

  it("gives every seat a different card", () => {
    for (const c of CODES) {
      const cards = new Set<string>();
      for (let seat = MIN_SEAT; seat <= MAX_SEAT; seat++) cards.add(ids(deal(c, seat)).join());
      expect(cards.size, c.text).toBe(MAX_SEAT - MIN_SEAT + 1);
    }
  });

  it("gives different codes different cards for the same seat", () => {
    const cards = new Set(CODES.map((c) => ids(deal(c, 1)).join()));
    expect(cards.size).toBe(CODES.length);
  });

  it("gives every card the same easy, medium and rare mix", () => {
    for (const c of CODES) {
      for (let seat = MIN_SEAT; seat <= MAX_SEAT; seat++) {
        const card = deal(c, seat);
        for (const tier of TIERS) {
          expect(card.cells.filter((s) => s?.tier === tier).length, `${c.text} seat ${seat} ${tier}`).toBe(
            MIX[c.size][tier],
          );
        }
      }
    }
  });

  it("never repeats a sight on a card, and puts the free square in the middle of 5×5 only", () => {
    for (const c of CODES) {
      for (let seat = MIN_SEAT; seat <= MAX_SEAT; seat++) {
        const card = deal(c, seat);
        expect(card.size).toBe(c.size);
        expect(card.cells).toHaveLength(c.size * c.size);
        const sights = card.cells.filter((s) => s !== null).map((s) => s.id);
        expect(new Set(sights).size).toBe(sights.length);
        if (c.size === 5) {
          expect(card.cells[12]).toBeNull();
          expect(sights).toHaveLength(24);
        } else {
          expect(sights).toHaveLength(16);
        }
      }
    }
  });

  it("deals the pinned cards: the deal itself is frozen with the lists", () => {
    // If this fails you changed the hash, the shuffle or the order of the deal, which
    // changes every card for every code. Put it back, or deal differently in a new edition.
    expect(ids(deal(code("CHAI-42"), 1)).slice(0, 8)).toEqual(PINNED_5);
    expect(ids(deal(code("DOSA-17"), 3)).slice(0, 8)).toEqual(PINNED_4);
  });
});

const PINNED_5 = ["tractor", "tempo-traveller", "charpai-nap", "mango-stall", "sheep", "puncture-repair", "three-scripts", "speed-breaker"];
const PINNED_4 = ["toll-booth", "misspelled-sign", "solar-farm", "sleeping-dog", "coconut-stall", "plane", "cow-divider", "auto-line"];

describe("lines", () => {
  it("has rows, columns and both diagonals", () => {
    expect(lines(5)).toHaveLength(12);
    expect(lines(4)).toHaveLength(10);
    expect(lines(5)).toContainEqual([0, 6, 12, 18, 24]);
    expect(lines(5)).toContainEqual([4, 8, 12, 16, 20]);
    expect(lines(5)).toContainEqual([2, 7, 12, 17, 22]);
    expect(lines(4)).toContainEqual([12, 13, 14, 15]);
    expect(lines(4)).toContainEqual([3, 6, 9, 12]);
  });
});

describe("progress", () => {
  it("counts the free middle as marked on 5×5", () => {
    expect(freeCell(5)).toBe(12);
    expect(freeCell(4)).toBeNull();
    const p = progress(5, [10, 11, 13, 14]);
    expect(p.done).toEqual([[10, 11, 12, 13, 14]]);
    expect(p.toGo).toBe(0);
    expect(p.marked).toBe(4);
    expect(p.left).toBe(20);
  });

  it("finds a diagonal, a column and how close the nearest line is", () => {
    expect(progress(4, [0, 5, 10, 15]).done).toEqual([[0, 5, 10, 15]]);
    expect(progress(4, [3, 7, 11, 15]).done).toEqual([[3, 7, 11, 15]]);
    expect(progress(4, [3, 7, 11]).toGo).toBe(1);
    expect(progress(4, []).toGo).toBe(4);
    // The free middle puts the middle row, column and both diagonals one square closer.
    expect(progress(5, []).toGo).toBe(4);
    expect(progress(5, [0, 6]).toGo).toBe(2);
  });

  it("knows a full card", () => {
    const all5 = [...Array(25).keys()].filter((i) => i !== 12);
    expect(progress(5, all5).full).toBe(true);
    expect(progress(5, all5).done).toHaveLength(12);
    expect(progress(5, all5.slice(1)).full).toBe(false);
    expect(progress(4, [...Array(16).keys()]).full).toBe(true);
  });
});
