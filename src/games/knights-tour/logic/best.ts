import { isSize, type Size } from "./board";

/** The fastest finished tour for one board size, on this device. */
export type Best = {
  ms: number;
  undos: number;
  hints: number;
  /** When that run started; tells the result screen the record is this run's. */
  runId: number;
};

export type BestTimes = Partial<Record<Size, Best>>;

/** The table with this run added, or the same table when the run isn't faster. */
export function withRun(table: BestTimes, size: Size, run: Best): BestTimes {
  const current = table[size];
  if (current && current.ms <= run.ms) return table;
  return { ...table, [size]: run };
}

/** Reads a saved table, dropping anything malformed (old versions, hand edits). */
export function parseBest(raw: string | null): BestTimes {
  if (!raw) return {};
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!data || typeof data !== "object") return {};
  const table: BestTimes = {};
  for (const [key, value] of Object.entries(data)) {
    const size = Number(key);
    if (!isSize(size) || !value || typeof value !== "object") continue;
    const { ms, undos, hints, runId } = value as Record<string, unknown>;
    if ([ms, undos, hints, runId].every((v) => typeof v === "number" && Number.isFinite(v) && v >= 0)) {
      table[size] = { ms, undos, hints, runId } as Best;
    }
  }
  return table;
}
