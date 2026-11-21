"use client";

import { createStore } from "@/party/ui/store";
import { emptyStats, parseStats, recordResult, type DailyResult, type DailyStats } from "@/solo/daily";
import { changeSound, DEFAULT_SOUND, parseSound, type SoundOptions } from "@/solo/options";

import { DIST_SIZE, EMPTY, OPTIONS_KEY, parseSaved, reduceSaved, SAVE_KEY, STATS_KEY, type Saved, type SavedAction } from "../logic/saved";

/** The run on screen, so a reload comes back to it. */
const saved = createStore<Saved, SavedAction>(SAVE_KEY, parseSaved, reduceSaved, EMPTY);
export const useSaved = saved.useStore;
export const act = saved.act;

/** The daily stats, in this browser only. */
const stats = createStore<DailyStats, DailyResult>(STATS_KEY, (raw) => parseStats(raw, DIST_SIZE), recordResult, emptyStats(DIST_SIZE));
export const useStats = stats.useStore;
/** Adds a day's result; a second one for the same day changes nothing. */
export const recordDaily = stats.act;

const options = createStore<SoundOptions, Partial<SoundOptions>>(OPTIONS_KEY, parseSound, changeSound, DEFAULT_SOUND);
/** The Sound switch (Settings, opened from the game). */
export const useOptions = options.useStore;
export const setOptions = options.act;
