import { playNoise, playNotes, soundLikeMedia, vibrate } from "@/ui/sound";

/**
 * Patakha's sounds, all behind its Sound switch, made with Web Audio (no files). iPhones
 * only play sound that a tap started, so every tap that starts or resumes a fuse calls
 * `wake` first; the ticks and the bang after it then play on their own.
 */

/** On a tap: lets the phone play the fuse (through the silent switch on newer iPhones). */
export function wake(): void {
  soundLikeMedia(true);
  playNotes([]);
}

/** Lighting it: a short fizz. */
export function fizz(): void {
  playNoise([[0, 0.5, 0.08, 7_500]]);
}

/** A tick of the fuse: tick-tock while calm, higher and sharper once it hurries. */
export function fuseTick(count: number, hurried: boolean): void {
  if (hurried) playNotes([[1_480, 0, 0.04, 0.12]]);
  else playNotes([[count % 2 ? 980 : 1_180, 0, 0.05, 0.1]]);
}

/** A pass: a soft pop. */
export function passPop(): void {
  playNotes([[620, 0, 0.06, 0.06]]);
}

/** The bang: a crack, a rolling boom and a few crackles, and a long buzz on Android. Peaks
    at about 0.8 of full scale, so it's loud without clipping. The last bang of a game ends
    with a little fanfare for whoever's left. */
export function bang(won: boolean): void {
  vibrate([380, 90, 160]);
  playNoise([
    [0, 0.1, 0.58, 9_000],
    [0.005, 1.3, 0.65, 1_600],
    [0.2, 0.05, 0.28, 6_000],
    [0.33, 0.04, 0.2, 6_500],
    [0.43, 0.05, 0.16, 5_500],
    [0.56, 0.04, 0.1, 6_000],
  ]);
  playNotes([
    [110, 0, 0.45, 0.32],
    [82, 0.02, 0.6, 0.26],
  ]);
  if (won) {
    playNotes([
      [523, 1.1, 0.16, 0.07],
      [659, 1.24, 0.16, 0.07],
      [784, 1.38, 0.16, 0.07],
      [1_047, 1.52, 0.5, 0.08],
    ]);
  }
}

/** Setup's Test sound: the fizz, then a small bang. */
export function testSound(): void {
  wake();
  fizz();
  playNoise([
    [0.55, 0.08, 0.35, 9_000],
    [0.555, 0.8, 0.35, 1_600],
  ]);
}
