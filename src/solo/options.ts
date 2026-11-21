/** A daily puzzle's options, kept in this browser: only the Sound switch for now. */
export type SoundOptions = { sound: boolean };

export const DEFAULT_SOUND: SoundOptions = { sound: true };

export function changeSound(options: SoundOptions, patch: Partial<SoundOptions>): SoundOptions {
  const next = { ...options, ...patch };
  return next.sound === options.sound ? options : next;
}

/** A save read defensively: anything odd falls back to the default. */
export function parseSound(raw: string | null): SoundOptions | null {
  let v: unknown;
  try {
    v = JSON.parse(raw ?? "null");
  } catch {
    return null;
  }
  if (typeof v !== "object" || v === null) return null;
  const o = v as Record<string, unknown>;
  return { sound: typeof o.sound === "boolean" ? o.sound : DEFAULT_SOUND.sound };
}
