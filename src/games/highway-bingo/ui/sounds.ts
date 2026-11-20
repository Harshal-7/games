import { playNotes, vibrate } from "@/ui/sound";

/**
 * Highway Bingo's sounds, behind its Sound switch, each started by a tap (iPhones only
 * play sound a tap started). It doesn't ask iPhones to play through the silent switch:
 * that would pause the car's music.
 */

/** Marking a square: a soft rubber-stamp thud. */
export function stampSound(): void {
  playNotes([
    [196, 0, 0.09, 0.08],
    [147, 0.012, 0.13, 0.06],
  ]);
}

/** Unmarking one: a light tick. */
export function unstampSound(): void {
  playNotes([[392, 0, 0.06, 0.035]]);
}

/** A bingo: two horn honks and a rising run, with a buzz on Android. */
export function bingoSound(): void {
  vibrate([90, 60, 90, 60, 260]);
  playNotes([
    [392, 0, 0.14, 0.05],
    [494, 0, 0.14, 0.05],
    [392, 0.2, 0.26, 0.05],
    [494, 0.2, 0.26, 0.05],
    [523, 0.55, 0.12, 0.06],
    [659, 0.67, 0.12, 0.06],
    [784, 0.79, 0.12, 0.06],
    [1047, 0.91, 0.5, 0.07],
  ]);
}
