"use client";

import { useSyncExternalStore } from "react";

/**
 * The narrator: reads lines out loud with the phone's own voice (speechSynthesis), in
 * English (India) when the phone has that voice and the default one otherwise. Phones
 * only let a page speak once someone has tapped it (iPhones need the first line to come
 * straight from a tap), so every main button calls `unlock()` first. Until then, after a
 * reload, the night waits for a tap on Carry on.
 */

function synth(): SpeechSynthesis | null {
  return typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null;
}

const lang = (voice: SpeechSynthesisVoice) => voice.lang.replace("_", "-").toLowerCase();

/**
 * English (India) if there is one. Offline, only a voice on the phone itself works: some
 * browsers list voices that need the internet.
 */
function pickVoice(s: SpeechSynthesis): SpeechSynthesisVoice | null {
  const indian = s.getVoices().filter((v) => lang(v) === "en-in");
  const offline = typeof navigator !== "undefined" && navigator.onLine === false;
  return indian.find((v) => v.localService) ?? (offline ? null : (indian[0] ?? null));
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
 * Call from a tap, before anything is said. Asks iPhones to play the page's sound as
 * playback, so the narrator isn't muted by the silent switch (Safari 17 and later). A tap
 * that isn't about to say a line itself (`speaking` false) says nothing out loud instead:
 * iPhones count that as the first line, so lines from the clock can follow.
 */
export function unlock(speaking = false): void {
  if (unlocked) return;
  const s = synth();
  if (s) {
    try {
      const session = (navigator as AudioSessionNavigator).audioSession;
      if (session) session.type = "playback";
    } catch {
      // Not every browser lets a page choose; the narrator still works with sound on.
    }
    if (!speaking) {
      const silent = new SpeechSynthesisUtterance("");
      silent.volume = 0;
      s.speak(silent);
    }
  }
  unlocked = true;
  for (const listener of listeners) listener();
}

/* ---------- Speaking ---------- */

let lastKey: string | null = null;
let pending: number | undefined;

/**
 * Says `lines`, replacing anything still being said. `key` names the moment (night 2,
 * the Doctor's call): the same key isn't said twice, so coming back to a page doesn't
 * repeat itself. "Say it again" passes `again`.
 */
export function say(key: string, lines: readonly string[], again = false): void {
  const s = synth();
  if (!s || (!again && key === lastKey)) return;
  lastKey = key;
  window.clearTimeout(pending);
  const speak = () => {
    s.resume();
    const voice = pickVoice(s);
    for (const text of lines) {
      const line = new SpeechSynthesisUtterance(text);
      line.lang = voice?.lang ?? "en-IN";
      if (voice) line.voice = voice;
      line.rate = 0.95;
      s.speak(line);
    }
  };
  // Some phones drop a line said straight after cancel(): give it a moment when
  // something is still being said. A line from a tap with nothing before it goes
  // straight out, while the tap still counts (iPhones).
  if (s.speaking || s.pending) {
    s.cancel();
    pending = window.setTimeout(speak, 80);
  } else {
    speak();
  }
}

/** Stops talking, say when the game is stopped. */
export function hush(): void {
  window.clearTimeout(pending);
  lastKey = null;
  synth()?.cancel();
}

/** Whether this phone can talk at all. */
export function canSpeak(): boolean {
  return synth() !== null;
}

// Some browsers load their voices late; asking once early makes the first line use the right one.
if (typeof window !== "undefined") synth()?.getVoices();
