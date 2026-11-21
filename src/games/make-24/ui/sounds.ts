/** Make 24's sounds, made with Web Audio (src/ui/sound.ts): no audio files. */

import { playNotes } from "@/ui/sound";

/** Two cards become one: a soft card flick. */
export function flick(): void {
  playNotes([
    [880, 0, 0.05, 0.03],
    [1320, 0.03, 0.06, 0.025],
  ]);
}

/** 24: a bright little run. */
export function made(): void {
  playNotes([587.33, 739.99, 880, 1174.66].map((f, i) => [f, i * 0.07, 0.26, 0.05] as const));
}

/** The last card isn't 24: two low notes. */
export function miss(): void {
  playNotes([
    [247, 0, 0.18, 0.045],
    [196, 0.12, 0.26, 0.04],
  ]);
}
