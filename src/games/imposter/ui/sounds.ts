import { playNotes, vibrate } from "@/ui/sound";

/**
 * Imposter's sounds, all behind the room's Sound switch. iPhones can't vibrate from a
 * web page and only play sound that a tap started, so the tap that starts talking
 * time also wakes the audio up for the ticks and the time's-up chime later.
 */
export function wakeAudio(): void {
  playNotes([]);
}

/** Pressing a card: one short buzz, the same for every card. */
export function buzzOpen(): void {
  vibrate(40);
}

/** Each of the last 10 seconds. */
export function tick(): void {
  playNotes([[1320, 0, 0.05, 0.035]]);
}

export function timeUp(): void {
  vibrate([200, 100, 200, 100, 400]);
  playNotes([
    [880, 0, 0.18, 0.07],
    [880, 0.25, 0.18, 0.07],
    [1175, 0.5, 0.5, 0.07],
  ]);
}
