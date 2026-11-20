import { audioContext, playNotes } from "@/ui/sound";

/**
 * A quiet night, made on the fly with Web Audio (no files): a soft hush like distant rain,
 * and a cricket now and then. It also covers the small sounds of someone leaning in to tap
 * the phone. It fades in as night falls and out by morning.
 */

let stop: (() => void) | null = null;

/** A few seconds of soft, deep noise (brown noise) to loop. */
function hush(ctx: AudioContext): AudioBuffer {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 6, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
    data[i] = last * 3.5;
  }
  // Ease the last half second back into the first, so the loop has no click.
  const blend = Math.floor(ctx.sampleRate / 2);
  for (let i = 0; i < blend; i++) {
    const t = i / blend;
    const end = data.length - blend + i;
    data[end] = data[end] * (1 - t) + data[i] * t;
  }
  return buffer;
}

function cricket(): void {
  const pitch = 4200 + Math.random() * 500;
  playNotes([0, 0.07, 0.14].map((delay) => [pitch, delay, 0.045, 0.012] as const));
}

export function startNightSound(): void {
  if (stop) return;
  const ctx = audioContext();
  if (!ctx) return;
  const source = ctx.createBufferSource();
  source.buffer = hush(ctx);
  source.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 800;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 3);
  source.connect(filter).connect(gain).connect(ctx.destination);
  source.start();

  let timer = 0;
  const next = () => {
    timer = window.setTimeout(() => {
      cricket();
      next();
    }, 1800 + Math.random() * 3200);
  };
  next();

  stop = () => {
    window.clearTimeout(timer);
    const now = ctx.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
    source.stop(now + 1.3);
    stop = null;
  };
}

export function stopNightSound(): void {
  stop?.();
}
