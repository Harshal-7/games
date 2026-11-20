import type { Pattern } from "../pattern";
import { EASY } from "./easy";
import { HARD } from "./hard";
import { MEDIUM } from "./medium";

/** The three hand-made packs, ten patterns each. Every pattern is open from the start. */
export type PackId = "easy" | "medium" | "hard";

export type PackPattern = {
  /** Stable for ever: best times are saved under it. */
  readonly id: string;
  readonly name: string;
  readonly pattern: Pattern;
};

export const PACKS: readonly { id: PackId; name: string; patterns: readonly PackPattern[] }[] = [
  { id: "easy", name: "Easy", patterns: EASY },
  { id: "medium", name: "Medium", patterns: MEDIUM },
  { id: "hard", name: "Hard", patterns: HARD },
];

export function findPattern(id: string): { pack: PackId; index: number; entry: PackPattern } | null {
  for (const pack of PACKS) {
    const index = pack.patterns.findIndex((p) => p.id === id);
    if (index >= 0) return { pack: pack.id, index, entry: pack.patterns[index] };
  }
  return null;
}
