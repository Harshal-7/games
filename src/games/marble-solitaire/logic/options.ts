/** Marble solitaire's options, kept in this browser. Only the Sound switch for now. */
export type Options = { sound: boolean };

export const OPTIONS_KEY = "games:marble-solitaire:options:v1";

export const DEFAULT_OPTIONS: Options = { sound: true };

export function changeOptions(options: Options, patch: Partial<Options>): Options {
  const next = { ...options, ...patch };
  return next.sound === options.sound ? options : next;
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
  return { sound: typeof o.sound === "boolean" ? o.sound : DEFAULT_OPTIONS.sound };
}
