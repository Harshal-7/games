/**
 * Sound and vibration for moves, both off unless switched on in Settings. Sounds
 * are made on the fly with Web Audio, so there are no audio files to load.
 */

export type Cue = "move" | "win" | "stuck";

let audio: AudioContext | null = null;

function context(): AudioContext | null {
  if (typeof window === "undefined" || !("AudioContext" in window)) return null;
  audio ??= new AudioContext();
  if (audio.state === "suspended") void audio.resume();
  return audio;
}

function tone(ctx: AudioContext, frequency: number, start: number, length: number, volume: number) {
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

export function cue(kind: Cue, { sound, vibrate }: { sound: boolean; vibrate: boolean }): void {
  if (vibrate && typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(kind === "move" ? 8 : kind === "win" ? [20, 60, 20, 60, 80] : 90);
  }
  if (!sound) return;
  const ctx = context();
  if (!ctx) return;
  const now = ctx.currentTime;
  if (kind === "move") {
    tone(ctx, 660, now, 0.09, 0.05);
  } else if (kind === "win") {
    // C, E, G, C: a small rising chime.
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(ctx, f, now + i * 0.09, 0.28, 0.05));
  } else {
    tone(ctx, 247, now, 0.2, 0.05);
    tone(ctx, 185, now + 0.14, 0.3, 0.045);
  }
}
