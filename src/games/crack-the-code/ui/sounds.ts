/** Crack the code's sounds, made with Web Audio (src/ui/sound.ts): no audio files. */

import { playNotes } from "@/ui/sound";

/** A guess goes in: a short double click, like a dial. */
export function dial(): void {
  playNotes([
    [1250, 0, 0.04, 0.03],
    [940, 0.05, 0.05, 0.03],
  ]);
}

/** Cracked: the lock opens, a rising run. */
export function open(): void {
  playNotes([523.25, 659.25, 783.99, 1046.5].map((f, i) => [f, i * 0.08, 0.28, 0.05] as const));
}

/** Not cracked: two low notes. */
export function shut(): void {
  playNotes([
    [247, 0, 0.2, 0.05],
    [185, 0.14, 0.3, 0.045],
  ]);
}
