import { randomItem, type Rng } from "@/party/logic/random";

import { HIGHWAY_V1, type Sight } from "./sights";

/**
 * The shared code, like CHAI-42: a word and two digits. It carries everything a phone
 * needs to deal the same cards as the phone that started the game, so Join only asks
 * for the code and a seat:
 *
 * - the word belongs to one edition (a pack and its frozen sight list version), and
 * - the digits pick the card size: even for 5×5, odd for 4×4.
 *
 * Words are frozen like the sight lists: one can be added to an edition, but never
 * removed or moved, or old codes would deal different cards.
 */

export type PackId = "highway";

export type Size = 4 | 5;

/** 5×5 first: the default. */
export const SIZES: readonly Size[] = [5, 4];

export type Edition = {
  pack: PackId;
  version: number;
  /** Code words for this edition. Upper case A–Z, never shared with another edition. */
  words: readonly string[];
  sights: readonly Sight[];
};

export const EDITIONS: readonly Edition[] = [
  {
    pack: "highway",
    version: 1,
    words: [
      "CHAI", "DHABA", "LASSI", "KULFI", "SAMOSA", "PAKORA", "JALEBI", "NIMBU",
      "BHUTTA", "VADA", "POHA", "IDLI", "DOSA", "THALI", "ROTI", "NAAN",
      "PAPAD", "ACHAR", "TIKKA", "TAPRI", "MASALA", "PANEER", "RAITA", "HALWA",
      "KHEER", "PEDA", "CHOLE", "RAJMA", "MOMO", "DHOKLA", "UPMA", "PURI",
    ],
    sights: HIGHWAY_V1,
  },
];

/** The edition new games use: the newest version of the pack. */
export function currentEdition(pack: PackId): Edition {
  const editions = EDITIONS.filter((e) => e.pack === pack);
  return editions.reduce((a, b) => (b.version > a.version ? b : a));
}

export type Code = {
  /** As shown and saved: "CHAI-42". */
  text: string;
  edition: Edition;
  size: Size;
};

export type CodeRead =
  | { ok: true; code: Code }
  /** empty: nothing typed · shape: not a word and two digits · unknown: a word this copy of the site doesn't know. */
  | { ok: false; problem: "empty" | "shape" | "unknown" };

/** Reads a typed code, forgiving case, spaces and dashes: "chai 42", "Chai-42" and "CHAI42" are all CHAI-42. */
export function readCode(input: string): CodeRead {
  const plain = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!plain) return { ok: false, problem: "empty" };
  const match = /^([A-Z]+)(\d{2})$/.exec(plain);
  if (!match) return { ok: false, problem: "shape" };
  const [, word, digits] = match;
  const edition = EDITIONS.find((e) => e.words.includes(word));
  if (!edition) return { ok: false, problem: "unknown" };
  return { ok: true, code: { text: `${word}-${digits}`, edition, size: Number(digits) % 2 === 0 ? 5 : 4 } };
}

/** A fresh code for a new game in the pack's current edition. */
export function newCode(pack: PackId, size: Size, rng: Rng): string {
  const word = randomItem(currentEdition(pack).words, rng);
  const n = Math.floor(rng() * 50) * 2 + (size === 5 ? 0 : 1);
  return `${word}-${String(n).padStart(2, "0")}`;
}
