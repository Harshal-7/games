"use client";

import { useSyncExternalStore } from "react";

import { audioContext } from "@/ui/sound";

import { CLIP_DIR, clipFile, FIXED_LINES } from "../logic/lines";

/**
 * The narrator. Every line without a player's name is a recording in Kokoro's "Heart"
 * voice (scripts/record-narrator.mjs), played through Web Audio. Lines with names (the
 * morning's story, who's out) use the phone's own voice: the best American English one
 * it has, unless the room picked another in Options. Phones only let a page make sound
 * once someone has tapped it, so every main button calls `unlock()` first. Until then,
 * after a reload, the night waits for a tap on Carry on.
 */

function synth(): SpeechSynthesis | null {
  return typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null;
}

const lang = (voice: SpeechSynthesisVoice) => voice.lang.replace("_", "-").toLowerCase();

/** macOS's joke voices (Bells, Zarvox…): never a narrator. */
const NOVELTY =
  /^(albert|bad news|bahh|bells|boing|bubbles|cellos|fred|good news|jester|junior|organ|ralph|superstar|trinoids|whisper|wobble|zarvox|grandma|grandpa|rocko|kathy)\b/i;

/**
 * How well a voice is likely to fit with the recorded narrator (an American woman's voice):
 * American English first, then the nicer kinds.
 */
function score(voice: SpeechSynthesisVoice): number {
  const id = `${voice.name} ${voice.voiceURI}`.toLowerCase();
  let points = lang(voice) === "en-us" ? 100 : lang(voice) === "en-in" ? 50 : 0;
  if (id.includes("premium")) points += 40;
  if (id.includes("enhanced")) points += 30;
  if (/^(samantha|ava|allison|susan|zoe|nicky|joelle|evan)\b/.test(voice.name.toLowerCase())) points += 20;
  if (id.includes("google")) points += 10;
  if (voice.localService) points += 5;
  return points;
}

/**
 * The phone's English voices that can narrate, best first. Offline, only voices on the
 * phone itself work: some browsers list voices that need the internet.
 */
export function narratorVoices(voices: readonly SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  const offline = typeof navigator !== "undefined" && navigator.onLine === false;
  return voices
    .filter((v) => lang(v).startsWith("en") && !NOVELTY.test(v.name) && (v.localService || !offline))
    .sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name));
}

/** The voice the room picked in Options (its name), or null for the best one. */
let chosen: string | null = null;
export function chooseVoice(name: string | null): void {
  chosen = name;
}

function pickVoice(s: SpeechSynthesis): SpeechSynthesisVoice | null {
  const voices = narratorVoices(s.getVoices());
  return voices.find((v) => v.name === chosen) ?? voices[0] ?? null;
}

/* ---------- The phone's voices, for the chooser ---------- */

let voiceList: SpeechSynthesisVoice[] = [];
const voiceListeners = new Set<() => void>();

function updateVoices(): void {
  const s = synth();
  voiceList = s ? narratorVoices(s.getVoices()) : [];
  for (const listener of voiceListeners) listener();
}

function subscribeVoices(onChange: () => void): () => void {
  voiceListeners.add(onChange);
  if (voiceListeners.size === 1) {
    synth()?.addEventListener("voiceschanged", updateVoices);
    updateVoices();
  }
  return () => {
    voiceListeners.delete(onChange);
    if (voiceListeners.size === 0) synth()?.removeEventListener("voiceschanged", updateVoices);
  };
}

const NO_VOICES: SpeechSynthesisVoice[] = [];

/** The phone's narrator voices, best first. Browsers load them late, so this updates. */
export function useVoices(): SpeechSynthesisVoice[] {
  return useSyncExternalStore(
    subscribeVoices,
    () => voiceList,
    () => NO_VOICES,
  );
}

/* ---------- Unlocking: once per page, from a tap ---------- */

let unlocked = false;
const listeners = new Set<() => void>();

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

/** Whether a tap has woken the narrator up since this page loaded. */
export function useUnlocked(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => unlocked,
    () => false,
  );
}

type AudioSessionNavigator = Navigator & { audioSession?: { type: string } };

/**
 * Call from a tap, before anything is said. Wakes the page's sound, asks iPhones to play it
 * as playback so the silent switch doesn't mute the narrator (Safari 17 and later), and
 * says nothing out loud in the phone's voice: iPhones count that as its first line, so
 * lines with names can follow later without a tap.
 */
export function unlock(): void {
  if (unlocked) return;
  // Wakes Web Audio from the tap: the recorded lines and the night sound play through it.
  audioContext();
  const s = synth();
  if (s) {
    try {
      const session = (navigator as AudioSessionNavigator).audioSession;
      if (session) session.type = "playback";
    } catch {
      // Not every browser lets a page choose; the narrator still works with sound on.
    }
    const silent = new SpeechSynthesisUtterance("");
    silent.volume = 0;
    s.speak(silent);
  }
  unlocked = true;
  for (const listener of listeners) listener();
}

/* ---------- Speaking ---------- */

const RECORDED = new Set(FIXED_LINES);
const clips = new Map<string, Promise<AudioBuffer | null>>();

/** A recorded line's sound, fetched and decoded once (null if it can't be had). */
function clip(text: string): Promise<AudioBuffer | null> {
  let loading = clips.get(text);
  if (!loading) {
    const ctx = audioContext();
    loading = ctx
      ? fetch(`${CLIP_DIR}/${clipFile(text)}`)
          .then((response) => (response.ok ? response.arrayBuffer() : Promise.reject(new Error(String(response.status)))))
          .then((data) => ctx.decodeAudioData(data))
          .catch(() => {
            clips.delete(text);
            return null;
          })
      : Promise.resolve(null);
    clips.set(text, loading);
  }
  return loading;
}

/** Fetches every recorded line ahead of time, so the night's calls start without a wait. */
export function preloadClips(): void {
  for (const text of RECORDED) void clip(text);
}

let run = 0;
let playing: AudioBufferSourceNode | null = null;
let utterance: SpeechSynthesisUtterance | null = null;

function playClip(buffer: AudioBuffer): Promise<void> {
  const ctx = audioContext();
  if (!ctx) return Promise.resolve();
  return new Promise((done) => {
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.onended = () => done();
    playing = source;
    source.start();
  });
}

/** One line in the phone's own voice. Some phones never say when they're done: a timeout covers that. */
function speakLine(s: SpeechSynthesis, text: string, mine: number): Promise<void> {
  return new Promise((done) => {
    const go = () => {
      if (mine !== run) return done();
      const voice = pickVoice(s);
      const line = new SpeechSynthesisUtterance(text);
      line.lang = voice?.lang ?? "en-US";
      if (voice) line.voice = voice;
      line.rate = 0.95;
      const timer = window.setTimeout(done, 2000 + text.length * 120);
      line.onend = line.onerror = () => {
        window.clearTimeout(timer);
        done();
      };
      utterance = line; // kept, so the browser doesn't drop it before it ends
      s.resume();
      s.speak(line);
    };
    // Some phones drop a line said straight after cancel(): give it a moment.
    if (s.speaking || s.pending) {
      s.cancel();
      window.setTimeout(go, 80);
    } else {
      go();
    }
  });
}

/** Stops whatever is being said. */
function stop(): void {
  run++;
  try {
    playing?.stop();
  } catch {
    // Already finished.
  }
  playing = null;
  if (utterance) utterance.onend = utterance.onerror = null;
  utterance = null;
  const s = synth();
  if (s && (s.speaking || s.pending)) s.cancel();
}

/**
 * Says `lines` in order, replacing anything still being said: recorded lines play their
 * clip, lines with a player's name use the phone's voice. `key` names the moment (night 2,
 * the Doctor's call): the same key isn't said twice, so coming back to a page doesn't
 * repeat itself. "Say it again" passes `again`.
 */
export function say(key: string, lines: readonly string[], again = false): void {
  if (!again && key === lastKey) return;
  lastKey = key;
  stop();
  const mine = run;
  void (async () => {
    for (const text of lines) {
      if (mine !== run) return;
      const buffer = RECORDED.has(text) ? await clip(text) : null;
      if (mine !== run) return;
      if (buffer) {
        await playClip(buffer);
      } else {
        const s = synth();
        if (s) await speakLine(s, text, mine);
      }
    }
  })();
}

let lastKey: string | null = null;

/** Stops talking, say when the game is stopped. */
export function hush(): void {
  lastKey = null;
  stop();
}

/** Whether this phone can talk at all: recorded lines play anywhere with Web Audio. */
export function canSpeak(): boolean {
  return typeof window !== "undefined" && ("AudioContext" in window || synth() !== null);
}

// Some browsers load their voices late; asking once early makes the first line use the right one.
if (typeof window !== "undefined") synth()?.getVoices();
