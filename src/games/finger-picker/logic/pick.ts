import { randomItem, type Rng } from "@/party/logic/random";

/**
 * The three ways the picker decides, each one fair: a single uniform pick, teams made by
 * shuffling and dealing in turn (sizes differ by one at most), and a shuffled order.
 */

export type Mode = "one" | "teams" | "order";
export const MODES: readonly Mode[] = ["one", "teams", "order"];

export const MIN_TEAMS = 2;
export const MAX_TEAMS = 4;

/** Fisher–Yates: every order equally likely. */
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function pickOne<T>(items: readonly T[], rng: Rng): T {
  return randomItem(items, rng);
}

/**
 * Up to `count` teams (never more teams than people): shuffled, then dealt one each in
 * turn like cards, so team sizes differ by one at most.
 */
export function makeTeams<T>(items: readonly T[], count: number, rng: Rng): T[][] {
  const k = Math.max(1, Math.min(count, items.length));
  const teams: T[][] = Array.from({ length: k }, () => []);
  shuffle(items, rng).forEach((item, i) => teams[i % k].push(item));
  return teams;
}

export function makeOrder<T>(items: readonly T[], rng: Rng): T[] {
  return shuffle(items, rng);
}
