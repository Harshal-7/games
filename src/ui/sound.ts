/**
 * Tiny sound and vibration helpers shared by the games. Sounds are made on the fly
 * with Web Audio, so there are no audio files to load.
 */

let audio: AudioContext | null = null;

function context(): AudioContext | null {
  if (typeof window === "undefined" || !("AudioContext" in window)) return null;
  audio ??= new AudioContext();
  if (audio.state === "suspended") void audio.resume();
  return audio;
}

/** A soft note: [frequency Hz, delay s, length s, volume 0–1]. */
export type Note = readonly [frequency: number, delay: number, length: number, volume: number];

export function playNotes(notes: readonly Note[]): void {
  const ctx = context();
  if (!ctx) return;
  const now = ctx.currentTime;
  for (const [frequency, delay, length, volume] of notes) {
    const start = now + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + length + 0.02);
  }
}

export function vibrate(pattern: number | number[]): void {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(pattern);
}
