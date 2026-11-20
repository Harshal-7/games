"use client";

import { useEffect, useRef } from "react";

import type { GameSlug } from "@/games/slugs";

/**
 * What leaving a game through "‹ Games" means for it right now. Leaving on purpose ends
 * the game; a reload, a locked phone or a trip to Settings doesn't, so the game is still
 * there when you come back.
 */
export type LeaveGuard = {
  /** A game is under way: ask before leaving. */
  ask: boolean;
  /** What the question says will be lost. */
  detail: string;
  /** Ends the game, keeping players and options. Runs on every leave, asked or not. */
  end: () => void;
};

const guards = new Map<GameSlug, () => LeaveGuard>();

/** Called by a game's main component on every render, with its current guard. */
export function useLeaveGuard(game: GameSlug, guard: LeaveGuard): void {
  const latest = useRef(guard);
  useEffect(() => {
    latest.current = guard;
  });
  useEffect(() => {
    const read = () => latest.current;
    guards.set(game, read);
    return () => {
      if (guards.get(game) === read) guards.delete(game);
    };
  }, [game]);
}

/** The guard of the game on screen, if it has one. */
export function leaveGuard(game: GameSlug): LeaveGuard | undefined {
  return guards.get(game)?.();
}
