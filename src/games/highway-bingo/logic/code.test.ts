import { describe, expect, it } from "vitest";

import { seeded } from "@/party/logic/random";

import { currentEdition, EDITIONS, newCode, readCode } from "./code";

describe("code words", () => {
  it("are upper case A–Z, 3 to 6 letters, and never shared between editions", () => {
    const all = EDITIONS.flatMap((e) => e.words);
    expect(new Set(all).size).toBe(all.length);
    for (const word of all) expect(word, word).toMatch(/^[A-Z]{3,6}$/);
  });

  it("give each edition enough codes that two cars rarely share one", () => {
    for (const e of EDITIONS) expect(e.words.length * 50, e.pack).toBeGreaterThanOrEqual(1000);
  });

  it("start new games on the newest version of a pack", () => {
    expect(currentEdition("highway").version).toBe(Math.max(...EDITIONS.map((e) => e.version)));
  });
});

describe("readCode", () => {
  it("forgives case, spaces and dashes", () => {
    for (const typed of ["CHAI-42", "chai42", "Chai 42", " chai - 42 ", "CHAI.42"]) {
      const read = readCode(typed);
      expect(read.ok && read.code.text, typed).toBe("CHAI-42");
    }
  });

  it("takes the size from the digits: even is 5×5, odd is 4×4", () => {
    const size = (typed: string) => {
      const read = readCode(typed);
      return read.ok ? read.code.size : null;
    };
    expect(size("CHAI-42")).toBe(5);
    expect(size("CHAI-00")).toBe(5);
    expect(size("CHAI-07")).toBe(4);
    expect(size("CHAI-99")).toBe(4);
  });

  it("says what's wrong with a code it can't read", () => {
    const problem = (typed: string) => {
      const read = readCode(typed);
      return read.ok ? null : read.problem;
    };
    expect(problem("")).toBe("empty");
    expect(problem(" - ")).toBe("empty");
    expect(problem("CHAI")).toBe("shape");
    expect(problem("CHAI-4")).toBe("shape");
    expect(problem("CHAI-423")).toBe("shape");
    expect(problem("42-CHAI")).toBe("shape");
    // A word from a newer version of the site, on a phone that hasn't updated.
    expect(problem("ZEBRA-42")).toBe("unknown");
  });
});

describe("newCode", () => {
  it("makes codes the same phone and every other phone can read, in the size asked for", () => {
    const rng = seeded(1);
    for (let i = 0; i < 200; i++) {
      for (const size of [4, 5] as const) {
        const read = readCode(newCode("highway", size, rng));
        expect(read.ok).toBe(true);
        if (read.ok) {
          expect(read.code.size).toBe(size);
          expect(read.code.text).toMatch(/^[A-Z]+-\d{2}$/);
          expect(read.code.edition).toBe(currentEdition("highway"));
        }
      }
    }
  });
});
