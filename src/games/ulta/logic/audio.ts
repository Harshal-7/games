/**
 * What Ulta does to a recording, on plain arrays of samples (-1 to 1): mix to one
 * channel, cut the silence off both ends, flip it back to front, and even out the
 * volume so a quiet copy still plays loud. Nothing here touches the mic or the
 * speaker, so all of it is tested.
 */

/** One recording: mono samples and how many there are per second. */
export type Clip = { samples: Float32Array; rate: number };

/** How long a clip lasts, in seconds. */
export function seconds(clip: Clip): number {
  return clip.samples.length / clip.rate;
}

/** Mixes any number of channels down to one. Phones record mono, but some report two. */
export function toMono(channels: readonly Float32Array[]): Float32Array {
  if (channels.length === 0) return new Float32Array(0);
  if (channels.length === 1) return channels[0].slice();
  const length = Math.min(...channels.map((c) => c.length));
  const out = new Float32Array(length);
  for (const channel of channels) {
    for (let i = 0; i < length; i++) out[i] += channel[i] / channels.length;
  }
  return out;
}

/** The same samples back to front, in a new array. */
export function reversed(samples: Float32Array): Float32Array {
  const out = new Float32Array(samples.length);
  for (let i = 0, j = samples.length - 1; j >= 0; i++, j--) out[i] = samples[j];
  return out;
}

/**
 * How loud a recording is: its peak, and its level, the loudness that 0.5% of
 * samples go above. The level ignores the odd click or bump of the phone, so
 * evening out the volume is steered by the singing, not by one loud tap.
 */
export function loudness(samples: Float32Array): { peak: number; level: number } {
  const BINS = 2000;
  const counts = new Uint32Array(BINS);
  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    const a = Math.min(1, Math.abs(samples[i]));
    if (a > peak) peak = a;
    counts[Math.min(BINS - 1, Math.floor(a * BINS))]++;
  }
  // Walk down from the loudest bin until 0.5% of the samples are above.
  const above = samples.length * 0.005;
  let seen = 0;
  let level = 0;
  for (let bin = BINS - 1; bin >= 0; bin--) {
    seen += counts[bin];
    if (seen > above) {
      level = (bin + 1) / BINS;
      break;
    }
  }
  return { peak, level: Math.min(level, peak) };
}

/** Below this level a recording is treated as nothing heard (about -48 dB). */
export const SILENT_LEVEL = 0.004;

const WINDOW_S = 0.02;

/**
 * Cuts the quiet off both ends, leaving a short lead-in and tail so a word isn't
 * clipped. A part counts as sound when its 20 ms loudness is above a tenth of the
 * recording's level. Gives back a copy; a recording with no sound comes back empty.
 */
export function trimSilence(clip: Clip, { lead = 0.08, tail = 0.15 } = {}): Clip {
  const { samples, rate } = clip;
  const { level } = loudness(samples);
  if (level < SILENT_LEVEL) return { samples: new Float32Array(0), rate };
  const threshold = Math.max(level * 0.1, SILENT_LEVEL / 2);
  const size = Math.max(1, Math.round(WINDOW_S * rate));
  let first = -1;
  let last = -1;
  for (let start = 0; start < samples.length; start += size) {
    const end = Math.min(samples.length, start + size);
    let sum = 0;
    for (let i = start; i < end; i++) sum += samples[i] * samples[i];
    if (Math.sqrt(sum / (end - start)) > threshold) {
      if (first < 0) first = start;
      last = end;
    }
  }
  if (first < 0) return { samples: new Float32Array(0), rate };
  const from = Math.max(0, first - Math.round(lead * rate));
  const to = Math.min(samples.length, last + Math.round(tail * rate));
  return { samples: samples.slice(from, to), rate };
}

/** Where evened-out singing sits (its level), and the most it's ever turned up (about +30 dB). */
export const TARGET_LEVEL = 0.7;
export const MAX_GAIN = 32;
/** Above the knee, peaks are rounded off towards the ceiling instead of clipping. */
const KNEE = 0.8;
const CEILING = 0.98;

/** How much to turn a recording up (or down) so its level sits at the target. */
export function levelGain(samples: Float32Array): number {
  const { level } = loudness(samples);
  if (level <= 0) return 1;
  return Math.min(MAX_GAIN, TARGET_LEVEL / level);
}

/** Rounds off anything above the knee so it never reaches full scale. */
export function softLimit(x: number): number {
  const a = Math.abs(x);
  if (a <= KNEE) return x;
  const room = CEILING - KNEE;
  return Math.sign(x) * (KNEE + room * Math.tanh((a - KNEE) / room));
}

/**
 * The recording at an even volume: turned up to the target level, peaks rounded off,
 * and a 10 ms fade at each end so a cut never clicks. Gives back a copy.
 */
export function levelled(samples: Float32Array, rate: number, gain = levelGain(samples)): Float32Array {
  const out = new Float32Array(samples.length);
  const fade = Math.min(Math.round(0.01 * rate), Math.floor(samples.length / 2));
  for (let i = 0; i < samples.length; i++) {
    let x = softLimit(samples[i] * gain);
    if (i < fade) x *= i / fade;
    else if (i >= samples.length - fade) x *= (samples.length - 1 - i) / fade;
    out[i] = x;
  }
  return out;
}

/** What a finished take turned out to be. */
export type TakeCheck = { kind: "ok"; clip: Clip } | { kind: "silent" } | { kind: "short"; seconds: number };

/**
 * Checks a raw take: trims it, then calls it silent when nothing was heard and short
 * when the sound lasts under `min` seconds. A good take comes back trimmed.
 */
export function checkTake(raw: Clip, min: number): TakeCheck {
  const clip = trimSilence(raw);
  if (clip.samples.length === 0) return { kind: "silent" };
  const length = seconds(clip);
  if (length < min) return { kind: "short", seconds: length };
  return { kind: "ok", clip };
}
