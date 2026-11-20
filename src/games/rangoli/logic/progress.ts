import { ENDLESS_SIZES, isEndlessSize, type EndlessSize } from "./generator";
import { findPattern } from "./packs";
import type { PatternRef } from "./game";

/**
 * What this browser has drawn: a tick and a best time for each hand-made pattern, and
 * for Endless how many of each size and the fastest. Runs that Watch it solve helped
 * don't count. Saved as games:rangoli:progress:v1.
 */
export type Run = {
  ms: number;
  hints: number;
  undos: number;
  /** When the run started; tells the result card the record is this run's. */
  runId: number;
};

export type EndlessRecord = { drawn: number; best: Run | null; lastRun: number };

export type Progress = {
  best: Readonly<Record<string, Run>>;
  endless: Readonly<Partial<Record<EndlessSize, EndlessRecord>>>;
};

export const NO_PROGRESS: Progress = { best: {}, endless: {} };

/** A finished drawing. Safe to record twice: the second time changes nothing. */
export type Finished = { ref: PatternRef; run: Run };

export function recordRun(progress: Progress, { ref, run }: Finished): Progress {
  if (ref.kind === "pack") {
    const current = progress.best[ref.id];
    if (current && (current.ms <= run.ms || current.runId === run.runId)) return progress;
    return { ...progress, best: { ...progress.best, [ref.id]: run } };
  }
  const record = progress.endless[ref.size] ?? { drawn: 0, best: null, lastRun: -1 };
  if (record.lastRun === run.runId) return progress;
  const best = !record.best || run.ms < record.best.ms ? run : record.best;
  return { ...progress, endless: { ...progress.endless, [ref.size]: { drawn: record.drawn + 1, best, lastRun: run.runId } } };
}

/** The fastest run on this pattern (for Endless, on this size). */
export function bestFor(progress: Progress, ref: PatternRef): Run | null {
  return ref.kind === "pack" ? (progress.best[ref.id] ?? null) : (progress.endless[ref.size]?.best ?? null);
}

/** Reads saved progress, dropping anything malformed (older versions, hand edits). */
export function parseProgress(raw: string | null): Progress | null {
  if (!raw) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!data || typeof data !== "object") return null;
  const { best, endless } = data as Record<string, unknown>;
  const progress: { best: Record<string, Run>; endless: Partial<Record<EndlessSize, EndlessRecord>> } = {
    best: {},
    endless: {},
  };
  if (best && typeof best === "object") {
    for (const [id, value] of Object.entries(best)) {
      const run = parseRun(value);
      if (run && findPattern(id)) progress.best[id] = run;
    }
  }
  if (endless && typeof endless === "object") {
    for (const [size, value] of Object.entries(endless)) {
      if (!isEndlessSize(size) || !value || typeof value !== "object") continue;
      const { drawn, best: fastest, lastRun } = value as Record<string, unknown>;
      if (!isCount(drawn)) continue;
      progress.endless[size] = { drawn, best: parseRun(fastest), lastRun: typeof lastRun === "number" ? lastRun : -1 };
    }
  }
  return progress;
}

function parseRun(value: unknown): Run | null {
  if (!value || typeof value !== "object") return null;
  const { ms, hints, undos, runId } = value as Record<string, unknown>;
  if (![ms, hints, undos, runId].every(isCount)) return null;
  return { ms, hints, undos, runId } as Run;
}

function isCount(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v >= 0;
}

/** How many hand-made patterns of a pack have a tick. */
export function drawnIn(progress: Progress, ids: readonly string[]): number {
  return ids.filter((id) => progress.best[id]).length;
}

/** Every Endless size with its record, in order. */
export function endlessRecords(progress: Progress): { size: EndlessSize; record: EndlessRecord | null }[] {
  return ENDLESS_SIZES.map((size) => ({ size, record: progress.endless[size] ?? null }));
}
