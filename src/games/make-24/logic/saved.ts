import type { Top } from "./deal";
import { parseRun, reduceRun, type Run, type RunAction } from "./game";
import type { Level } from "./solver";

export type Practice = { level: Level; top: Top };

/** What's kept in this browser: the run on screen (or none: the start screen) and the Practice choice. */
export type Saved = { run: Run | null; practice: Practice };

export type SavedAction = RunAction | { type: "start"; run: Run } | { type: "quit" } | { type: "practice"; practice: Practice };

export const SAVE_KEY = "games:make-24:run:v1";
export const STATS_KEY = "games:make-24:stats:v1";
export const OPTIONS_KEY = "games:make-24:options:v1";
/** Stats' distribution: index = hands made, 0 to 5. */
export const DIST_SIZE = 6;

export const EMPTY: Saved = { run: null, practice: { level: "medium", top: 9 } };

export function reduceSaved(saved: Saved, action: SavedAction): Saved {
  switch (action.type) {
    case "start":
      return { ...saved, run: action.run };
    case "quit":
      return saved.run ? { ...saved, run: null } : saved;
    case "practice": {
      const { level, top } = action.practice;
      if (level === saved.practice.level && top === saved.practice.top) return saved;
      return { ...saved, practice: { level, top } };
    }
    default: {
      if (!saved.run) return saved;
      const run = reduceRun(saved.run, action);
      return run === saved.run ? saved : { ...saved, run };
    }
  }
}

export function parseSaved(raw: string | null): Saved | null {
  let v: unknown;
  try {
    v = JSON.parse(raw ?? "null");
  } catch {
    return null;
  }
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const p = o.practice as Partial<Practice> | undefined;
  const practice: Practice = {
    level: p?.level === "easy" || p?.level === "hard" || p?.level === "medium" ? p.level : EMPTY.practice.level,
    top: p?.top === 13 ? 13 : 9,
  };
  return { run: parseRun(o.run), practice };
}
