"use client";

import { createStore } from "@/party/ui/store";

import { DEFAULT_BOARD, type BoardId } from "../logic/boards";
import { parseBest, withRun, type Best, type BestResults } from "../logic/best";
import { newGame, parseGame, reduce, type Action, type Game } from "../logic/game";
import { changeOptions, DEFAULT_OPTIONS, OPTIONS_KEY, parseOptions, type Options } from "../logic/options";

/** The game in progress, so a reload comes back to the same board. */
const game = createStore<Game, Action>("games:marble-solitaire:game:v1", parseGame, reduce, newGame(DEFAULT_BOARD));

export const useGame = game.useStore;
export const act = game.act;

/** The best finished game per board, in this browser only. */
const best = createStore<BestResults, { board: BoardId; run: Best }>(
  "games:marble-solitaire:best:v1",
  parseBest,
  (table, { board, run }) => withRun(table, board, run),
  {},
);

export const useBest = best.useStore;

/** Saves the run if it beats the best on that board. Safe to call twice. */
export function recordBest(board: BoardId, run: Best): void {
  best.act({ board, run });
}

const options = createStore<Options, Partial<Options>>(OPTIONS_KEY, parseOptions, changeOptions, DEFAULT_OPTIONS);

/** The Sound switch (Settings, opened from the game). */
export const useOptions = options.useStore;
export const setOptions = options.act;
