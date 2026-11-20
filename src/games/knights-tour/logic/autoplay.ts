import type { Game } from "./game";
import { analyseCached } from "./solver";

/** What Watch it solve does next: a move, a step back, or null when the tour is done. */
export type SolveStep = { type: "play"; square: number } | { type: "undo" } | null;

export function nextSolveStep(game: Game): SolveStep {
  const { path, size } = game;
  if (path.length === size * size) return null;
  // A corner: a full tour starts there on every board size.
  if (path.length === 0) return { type: "play", square: 0 };
  const analysis = analyseCached(path, size);
  if (analysis.status === "solvable") return { type: "play", square: analysis.completion[0] };
  // A dead end, or too tangled to tell quickly: step back and try again from there.
  return { type: "undo" };
}
