import type { Rng } from "@/party/logic/random";

/** How a code is made: 3 to 5 digits, with or without repeated digits. */
export type Rules = { length: 3 | 4 | 5; repeats: boolean };

export const DAILY_RULES: Rules = { length: 4, repeats: false };
export const MAX_GUESSES = 10;

/** A guess's two counts: digits in the right place, and digits in the code but elsewhere. */
export type Score = { right: number; near: number };

/**
 * Scores a guess against the secret. With repeats, a digit only counts as many times as
 * it's in both: secret 1123, guess 1111 is two right and none near.
 */
export function score(secret: string, guess: string): Score {
  let right = 0;
  const inSecret = new Array<number>(10).fill(0);
  const inGuess = new Array<number>(10).fill(0);
  for (let i = 0; i < secret.length; i++) {
    const s = secret.charCodeAt(i) - 48;
    const g = guess.charCodeAt(i) - 48;
    if (s === g) right++;
    else {
      inSecret[s]++;
      inGuess[g]++;
    }
  }
  let near = 0;
  for (let d = 0; d < 10; d++) near += Math.min(inSecret[d], inGuess[d]);
  return { right, near };
}

export function isCode(code: string, rules: Rules): boolean {
  if (code.length !== rules.length || !/^\d+$/.test(code)) return false;
  return rules.repeats || new Set(code).size === code.length;
}

/** Every possible code, in order: 5,040 for 4 different digits, 100,000 for 5 with repeats. */
export function allCodes(rules: Rules): string[] {
  const codes: string[] = [];
  const total = 10 ** rules.length;
  for (let n = 0; n < total; n++) {
    const code = String(n).padStart(rules.length, "0");
    if (rules.repeats || new Set(code).size === rules.length) codes.push(code);
  }
  return codes;
}

export type Guess = { code: string } & Score;

/** The codes that fit every guess so far. */
export function codesLeft(rules: Rules, guesses: readonly Guess[]): string[] {
  let left = allCodes(rules);
  for (const g of guesses) {
    left = left.filter((code) => {
      const s = score(code, g.code);
      return s.right === g.right && s.near === g.near;
    });
  }
  return left;
}

/** A guess that could still be right: one of the codes left, picked at random. */
export function hintCode(rules: Rules, guesses: readonly Guess[], rng: Rng): string | null {
  const left = codesLeft(rules, guesses);
  return left.length ? left[Math.floor(rng() * left.length)] : null;
}

/** A new secret code. */
export function newSecret(rules: Rules, rng: Rng): string {
  if (rules.repeats) {
    let code = "";
    for (let i = 0; i < rules.length; i++) code += String(Math.floor(rng() * 10));
    return code;
  }
  const digits = [..."0123456789"];
  for (let i = 0; i < rules.length; i++) {
    const j = i + Math.floor(rng() * (digits.length - i));
    [digits[i], digits[j]] = [digits[j], digits[i]];
  }
  return digits.slice(0, rules.length).join("");
}
