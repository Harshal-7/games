import { MAX_TEAMS, MIN_TEAMS, MODES, type Mode } from "./pick";

/** The picker's choices, kept in this browser. The fingers themselves are never saved. */
export type Options = { mode: Mode; teams: number; sound: boolean };

export const OPTIONS_KEY = "games:finger-picker:options:v1";

export const DEFAULT_OPTIONS: Options = { mode: "one", teams: 2, sound: true };

export function changeOptions(options: Options, patch: Partial<Options>): Options {
  const next = { ...options, ...patch };
  next.teams = Math.min(MAX_TEAMS, Math.max(MIN_TEAMS, Math.round(next.teams)));
  const same = next.mode === options.mode && next.teams === options.teams && next.sound === options.sound;
  return same ? options : next;
}

/** A save read defensively: anything odd falls back to the default. */
export function parseOptions(raw: string | null): Options | null {
  let v: unknown;
  try {
    v = JSON.parse(raw ?? "null");
  } catch {
    return null;
  }
  if (typeof v !== "object" || v === null) return null;
  const o = v as Record<string, unknown>;
  return {
    mode: MODES.includes(o.mode as Mode) ? (o.mode as Mode) : DEFAULT_OPTIONS.mode,
    teams:
      typeof o.teams === "number" && Number.isInteger(o.teams) && o.teams >= MIN_TEAMS && o.teams <= MAX_TEAMS
        ? o.teams
        : DEFAULT_OPTIONS.teams,
    sound: typeof o.sound === "boolean" ? o.sound : DEFAULT_OPTIONS.sound,
  };
}
