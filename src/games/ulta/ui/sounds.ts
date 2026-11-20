import { playNotes, vibrate } from "@/ui/sound";

/**
 * Ulta's little sounds, behind its Sound switch. The recordings themselves always play:
 * the game is the recordings. The timer's ticks and time's-up come from the ring timer.
 */

/** They got it (or stole it): a quick rising run. */
export function cheer(): void {
  vibrate(60);
  playNotes([
    [659, 0, 0.12, 0.08],
    [784, 0.1, 0.12, 0.08],
    [1_047, 0.2, 0.35, 0.09],
  ]);
}

/** Nobody got it: two falling notes. */
export function shrug(): void {
  playNotes([
    [392, 0, 0.18, 0.07],
    [294, 0.18, 0.35, 0.07],
  ]);
}
