import { describe, expect, it } from "vitest";

import { seeded } from "@/party/logic/random";

import { allCodes, codesLeft, hintCode, isCode, newSecret, score, type Guess, type Rules } from "./code";

/** The textbook way: mark the exact matches, then pair off the rest one by one. */
function referenceScore(secret: string, guess: string) {
  const s = [...secret];
  const g = [...guess];
  let right = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === g[i]) {
      right++;
      s[i] = "S";
      g[i] = "G";
    }
  }
  let near = 0;
  for (let i = 0; i < g.length; i++) {
    if (g[i] === "G") continue;
    const j = s.indexOf(g[i]);
    if (j >= 0) {
      near++;
      s[j] = "S";
    }
  }
  return { right, near };
}

/** Every code by brute force: each digit place in turn, nothing clever. */
function bruteCodes(rules: Rules): string[] {
  let codes = [""];
  for (let i = 0; i < rules.length; i++) {
    codes = codes.flatMap((c) => [..."0123456789"].filter((d) => rules.repeats || !c.includes(d)).map((d) => c + d));
  }
  return codes;
}

const guess = (secret: string, code: string): Guess => ({ code, ...referenceScore(secret, code) });

describe("feedback", () => {
  it("counts right place and wrong place, without saying which", () => {
    expect(score("4072", "1234")).toEqual({ right: 0, near: 2 });
    expect(score("4072", "4072")).toEqual({ right: 4, near: 0 });
    expect(score("4072", "2704")).toEqual({ right: 0, near: 4 });
    expect(score("4072", "4027")).toEqual({ right: 2, near: 2 });
    expect(score("4072", "5689")).toEqual({ right: 0, near: 0 });
    expect(score("123", "321")).toEqual({ right: 1, near: 2 });
    expect(score("01234", "43210")).toEqual({ right: 1, near: 4 });
  });

  it("counts a repeated digit only as often as it's in both", () => {
    expect(score("1123", "1111")).toEqual({ right: 2, near: 0 });
    expect(score("1123", "3111")).toEqual({ right: 1, near: 2 });
    expect(score("1122", "2211")).toEqual({ right: 0, near: 4 });
    expect(score("1234", "1111")).toEqual({ right: 1, near: 0 });
    expect(score("1111", "1234")).toEqual({ right: 1, near: 0 });
    expect(score("2111", "1222")).toEqual({ right: 0, near: 2 });
    expect(score("00000", "00100")).toEqual({ right: 4, near: 0 });
    expect(score("55443", "34455")).toEqual({ right: 1, near: 4 });
  });

  it("matches the textbook scoring on thousands of random pairs, with and without repeats", () => {
    const rng = seeded(7);
    for (const length of [3, 4, 5] as const) {
      for (const repeats of [false, true]) {
        const rules = { length, repeats };
        for (let i = 0; i < 2000; i++) {
          const s = newSecret(rules, rng);
          const g = newSecret(rules, rng);
          expect(score(s, g)).toEqual(referenceScore(s, g));
        }
      }
    }
  });
});

describe("codes", () => {
  it("lists every code for each rule set", () => {
    expect(allCodes({ length: 4, repeats: false })).toHaveLength(5040);
    expect(allCodes({ length: 3, repeats: false })).toHaveLength(720);
    expect(allCodes({ length: 5, repeats: false })).toHaveLength(30240);
    expect(allCodes({ length: 4, repeats: true })).toHaveLength(10000);
    expect(allCodes({ length: 3, repeats: false })).toEqual(bruteCodes({ length: 3, repeats: false }).sort());
  });

  it("checks a code against the rules", () => {
    expect(isCode("4072", { length: 4, repeats: false })).toBe(true);
    expect(isCode("4472", { length: 4, repeats: false })).toBe(false);
    expect(isCode("4472", { length: 4, repeats: true })).toBe(true);
    expect(isCode("407", { length: 4, repeats: true })).toBe(false);
    expect(isCode("40a2", { length: 4, repeats: true })).toBe(false);
  });

  it("makes secrets that follow the rules", () => {
    const rng = seeded(3);
    for (let i = 0; i < 500; i++) {
      expect(isCode(newSecret({ length: 5, repeats: false }, rng), { length: 5, repeats: false })).toBe(true);
      expect(isCode(newSecret({ length: 3, repeats: true }, rng), { length: 3, repeats: true })).toBe(true);
    }
  });
});

describe("codes left", () => {
  it("counts the drawn example: 1260, 168, 14, then 6", () => {
    const rules: Rules = { length: 4, repeats: false };
    const steps = ["1234", "5067", "8902", "4310"].map((c) => guess("4072", c));
    expect([1, 2, 3, 4].map((n) => codesLeft(rules, steps.slice(0, n)).length)).toEqual([1260, 168, 14, 6]);
    expect(codesLeft(rules, steps)).toContain("4072");
  });

  it("matches a brute-force count on random games, with and without repeats", () => {
    const rng = seeded(11);
    for (const rules of [
      { length: 3, repeats: false },
      { length: 4, repeats: false },
      { length: 3, repeats: true },
      { length: 4, repeats: true },
    ] as Rules[]) {
      const every = bruteCodes(rules);
      for (let game = 0; game < 6; game++) {
        const secret = newSecret(rules, rng);
        const guesses: Guess[] = [];
        for (let turn = 0; turn < 4; turn++) {
          guesses.push(guess(secret, newSecret(rules, rng)));
          const brute = every.filter((c) => guesses.every((g) => {
            const s = referenceScore(c, g.code);
            return s.right === g.right && s.near === g.near;
          }));
          expect(codesLeft(rules, guesses)).toEqual(brute.sort());
          expect(brute).toContain(secret);
        }
      }
    }
  });

  it("gives hints that could still be right", () => {
    const rules: Rules = { length: 4, repeats: false };
    const rng = seeded(5);
    const guesses = ["1234", "5067"].map((c) => guess("4072", c));
    for (let i = 0; i < 50; i++) {
      const hint = hintCode(rules, guesses, rng)!;
      expect(guesses.every((g) => {
        const s = score(hint, g.code);
        return s.right === g.right && s.near === g.near;
      })).toBe(true);
    }
  });
});
