/** Rangoli's sounds, under its Sound switch (Settings): a soft note per line, a tune at the end. */

import { playNotes, vibrate } from "@/ui/sound";

// A major pentatonic run, so any line after any other sounds sweet.
const SCALE = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51];

/** A soft pluck for the line just drawn, climbing as the pattern fills in. */
export function lineSound(drawn: number, total: number): void {
  const step = Math.min(SCALE.length - 1, Math.floor((drawn / Math.max(total, 1)) * SCALE.length));
  playNotes([[SCALE[step], 0, 0.22, 0.045]]);
  vibrate(6);
}

/** A short rising tune when the last line is in. */
export function finishTune(): void {
  playNotes([523.25, 659.25, 783.99, 1046.5, 1318.51].map((f, i) => [f, i * 0.1, 0.4, 0.05] as const));
  vibrate([20, 60, 20, 60, 80]);
}

/** A low note: the drawing can't be finished from here. */
export function stuckSound(): void {
  playNotes([
    [247, 0, 0.2, 0.05],
    [185, 0.14, 0.3, 0.045],
  ]);
  vibrate(90);
}
