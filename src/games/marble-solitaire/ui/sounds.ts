/** Marble solitaire's sounds, made with Web Audio (src/ui/sound.ts): no audio files. */

import { playNoise, playNotes } from "@/ui/sound";

/** A glass marble landing in a wooden hole: a bright tick and a short knock. */
export function clack(): void {
  playNotes([
    [2150, 0, 0.045, 0.035],
    [1320, 0.006, 0.07, 0.03],
  ]);
  playNoise([[0, 0.05, 0.09, 2400]]);
}

/** One marble left: C, E, G, C, a small rising chime (higher still for a Perfect). */
export function chime(perfect: boolean): void {
  const notes = perfect ? [523.25, 659.25, 783.99, 1046.5, 1318.5] : [523.25, 659.25, 783.99, 1046.5];
  playNotes(notes.map((f, i) => [f, i * 0.09, 0.3, 0.05] as const));
}

/** No jump left with marbles to spare: two low notes. */
export function thud(): void {
  playNotes([
    [247, 0, 0.2, 0.05],
    [185, 0.14, 0.3, 0.045],
  ]);
}
