"use client";

import { useSyncExternalStore } from "react";

import { levelled, reversed, type Clip } from "../logic/audio";

/**
 * The turn's recordings, in this page's memory and nowhere else: never in the saved
 * room, never sent anywhere. They belong to one turn of one game (`key`) and are dropped
 * when the next turn starts or the game ends; a reload loses them, and the game sends
 * that turn back to singing.
 */

/** A take, ready to play: as sung, and back to front, both at an even volume. */
export type Take = { ahead: Clip; back: Clip; seconds: number };

type Takes = { key: string; original: Take | null; copy: Take | null };

let takes: Takes = { key: "", original: null, copy: null };
const listeners = new Set<() => void>();
const EMPTY: Takes = { key: "", original: null, copy: null };

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

/** Readies a trimmed take for playing. Done once, when it's recorded. */
export function readyTake(clip: Clip): Take {
  return {
    ahead: { samples: levelled(clip.samples, clip.rate), rate: clip.rate },
    back: { samples: levelled(reversed(clip.samples), clip.rate), rate: clip.rate },
    seconds: clip.samples.length / clip.rate,
  };
}

/** Keeps a take for a turn, replacing the one before (a turn's takes go when another turn's arrive). */
export function keepTake(key: string, which: "original" | "copy", clip: Clip): void {
  const base = takes.key === key ? takes : { key, original: null, copy: null };
  // A new singing take means any copy of the old one no longer fits.
  takes = which === "original" ? { ...base, original: readyTake(clip), copy: null } : { ...base, copy: readyTake(clip) };
  emit();
}

/** Drops every recording. */
export function dropTakes(): void {
  if (takes.key === "" && !takes.original && !takes.copy) return;
  takes = EMPTY;
  emit();
}

/** The takes for this turn: none if they belong to another turn or were lost in a reload. */
export function useTakes(key: string): { original: Take | null; copy: Take | null } {
  const now = useSyncExternalStore(subscribe, () => takes, () => EMPTY);
  return now.key === key ? now : EMPTY;
}

/** The current takes for a turn, outside React (a tap handler). */
export function takesFor(key: string): { original: Take | null; copy: Take | null } {
  return takes.key === key ? takes : EMPTY;
}
