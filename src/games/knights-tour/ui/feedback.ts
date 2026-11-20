/** Sound and vibration for moves, both off unless switched on in Settings. */

import { playNotes, vibrate as buzz } from "@/ui/sound";

export type Cue = "move" | "win" | "stuck";

export function cue(kind: Cue, { sound, vibrate }: { sound: boolean; vibrate: boolean }): void {
  if (vibrate) buzz(kind === "move" ? 8 : kind === "win" ? [20, 60, 20, 60, 80] : 90);
  if (!sound) return;
  if (kind === "move") {
    playNotes([[660, 0, 0.09, 0.05]]);
  } else if (kind === "win") {
    // C, E, G, C: a small rising chime.
    playNotes([523.25, 659.25, 783.99, 1046.5].map((f, i) => [f, i * 0.09, 0.28, 0.05] as const));
  } else {
    playNotes([
      [247, 0, 0.2, 0.05],
      [185, 0.14, 0.3, 0.045],
    ]);
  }
}
