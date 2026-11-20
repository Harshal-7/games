import { isBoardId, type BoardId } from "./boards";

/** The best finished game on one board, on this device. */
export type Best = {
  /** Marbles left at the end. */
  left: number;
  /** One marble, in the goal hole. */
  perfect: boolean;
  ms: number;
  hints: number;
  /** When that run started; tells the result card the record is this run's. */
  runId: number;
};

export type BestResults = Partial<Record<BoardId, Best>>;

/** Fewest marbles first, then Perfect over Solved, then the faster. */
export function beats(run: Best, current: Best | undefined): boolean {
  if (!current) return true;
  if (run.left !== current.left) return run.left < current.left;
  if (run.perfect !== current.perfect) return run.perfect;
  return run.ms < current.ms;
}

/** The table with this run added, or the same table when the run isn't better. */
export function withRun(table: BestResults, board: BoardId, run: Best): BestResults {
  return beats(run, table[board]) ? { ...table, [board]: run } : table;
}

/** Reads a saved table, dropping anything malformed (old versions, hand edits). */
export function parseBest(raw: string | null): BestResults {
  if (!raw) return {};
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!data || typeof data !== "object") return {};
  const table: BestResults = {};
  for (const [board, value] of Object.entries(data)) {
    if (!isBoardId(board) || !value || typeof value !== "object") continue;
    const { left, perfect, ms, hints, runId } = value as Record<string, unknown>;
    const counts = [left, ms, hints, runId].every((v) => typeof v === "number" && Number.isFinite(v) && v >= 0);
    if (counts && (left as number) >= 1 && typeof perfect === "boolean") {
      table[board] = { left, perfect, ms, hints, runId } as Best;
    }
  }
  return table;
}
