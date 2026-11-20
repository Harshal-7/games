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

/** A burst of noise: [delay s, length s, volume 0–1, lowpass Hz]. The filter closes as it fades,
    so a burst sounds like a crack, a boom or a fizz rather than a hiss. */
export type Burst = readonly [delay: number, length: number, volume: number, lowpass: number];

let noise: AudioBuffer | null = null;

/** A second of white noise, made once. */
function noiseBuffer(ctx: AudioContext): AudioBuffer {
  if (noise?.sampleRate === ctx.sampleRate) return noise;
  noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const samples = noise.getChannelData(0);
  for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
  return noise;
}

export function playNoise(bursts: readonly Burst[]): void {
  const ctx = context();
  if (!ctx) return;
  const buffer = noiseBuffer(ctx);
  const now = ctx.currentTime;
  for (const [delay, length, volume, lowpass] of bursts) {
    const start = now + delay;
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    source.buffer = buffer;
    source.loop = true;
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(lowpass, start);
    filter.frequency.exponentialRampToValueAtTime(Math.max(40, lowpass / 6), start + length);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start(start, Math.random() * 0.5);
    source.stop(start + length + 0.02);
  }
}

/** True when sound has started once but the phone isn't playing it now (a call or another app took over). */
export function soundBlocked(): boolean {
  return audio !== null && audio.state !== "running";
}

/**
 * iPhones mute web sound with the silent switch unless the page asks to play like media,
 * which also pauses music playing in other apps. For games that are mostly sound, while
 * they're on screen; does nothing on phones without the setting.
 */
export function soundLikeMedia(on: boolean): void {
  if (typeof navigator === "undefined") return;
  const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
  if (session) session.type = on ? "playback" : "auto";
}
