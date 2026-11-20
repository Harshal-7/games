"use client";

import { audioContext } from "@/ui/sound";

import type { Clip } from "../logic/audio";
import { setAudioSession } from "./mic";

/** A gap between clips played back to back, in seconds. */
const GAP = 0.7;

/** Something playing, which can be cut short. `ended` settles when it finishes or is stopped. */
export type Playing = { stop: () => void; ended: Promise<void> };

let current: Playing | null = null;

/** Stops whatever Ulta is playing. */
export function stopPlaying(): void {
  current?.stop();
  current = null;
}

/**
 * Plays clips one after another through the loudspeaker. Call it from a tap: iPhones
 * only play sound a tap started. Asking for the playback audio session first lets an
 * iPhone play with its silent switch on, and through the speaker rather than the
 * earpiece it uses while the mic is on.
 */
export function playClips(clips: readonly Clip[]): Playing {
  stopPlaying();
  setAudioSession("playback");
  const ctx = audioContext();
  if (!ctx) return { stop() {}, ended: Promise.resolve() };
  if (ctx.state !== "running") void ctx.resume();

  const sources: AudioBufferSourceNode[] = [];
  let at = ctx.currentTime + 0.05;
  for (const clip of clips) {
    if (clip.samples.length === 0) continue;
    const buffer = ctx.createBuffer(1, clip.samples.length, clip.rate);
    buffer.copyToChannel(clip.samples as Float32Array<ArrayBuffer>, 0);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(at);
    sources.push(source);
    at += buffer.duration + GAP;
  }

  let finish = () => {};
  const ended = new Promise<void>((resolve) => (finish = resolve));
  const last = sources.at(-1);
  if (last) last.onended = () => finish();
  else finish();

  const playing: Playing = {
    ended,
    stop() {
      for (const source of sources) {
        source.onended = null;
        try {
          source.stop();
        } catch {
          // Not started yet or already done.
        }
        source.disconnect();
      }
      finish();
      if (current === playing) current = null;
    },
  };
  current = playing;
  return playing;
}
