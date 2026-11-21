"use client";

import { createStore } from "@/party/ui/store";

import { changeOptions, DEFAULT_OPTIONS, NO_PLAY, parseOptions, parsePlay, reducePlay, type Options, type PlayAction, type Play } from "../logic/play";
import { NO_PROGRESS, parseProgress, recordRun, type Finished, type Progress } from "../logic/progress";
import { moveOldSaves } from "../logic/saves";

// Saves from when the game was called Rangoli in one line move over first.
if (typeof window !== "undefined") {
  try {
    moveOldSaves(localStorage);
  } catch {
    // Private mode or blocked storage: nothing to move.
  }
}

/** The screen, the tab and the drawings under way, so a reload comes back to them. */
const play = createStore<Play, PlayAction>("games:no-lift:play:v1", parsePlay, reducePlay, NO_PLAY);
export const usePlay = play.useStore;
export const actPlay = play.act;

/** Ticks and best times. Runs Watch it solve helped never reach it. */
const progress = createStore<Progress, Finished>("games:no-lift:progress:v1", parseProgress, recordRun, NO_PROGRESS);
export const useProgress = progress.useStore;
export const recordFinished = progress.act;

/** The Sound switch, in Settings. */
const options = createStore<Options, Partial<Options>>("games:no-lift:options:v1", parseOptions, changeOptions, DEFAULT_OPTIONS);
export const useOptions = options.useStore;
export const setOptions = options.act;
