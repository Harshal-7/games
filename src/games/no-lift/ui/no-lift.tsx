"use client";

import { useHydrated } from "@/party/ui/use-hydrated";
import { useLeaveGuard } from "@/ui/leave-guard";

import { current } from "../logic/play";
import { Drawing } from "./drawing";
import { PatternList } from "./pattern-list";
import { actPlay, usePlay } from "./stores";

import "./no-lift.css";

/**
 * No Lift: the pattern list, or a pattern on the floor. Both come back
 * after a reload. Leaving through "‹ Games" goes back to the list next time; every
 * drawing under way is kept, so there's nothing to ask about.
 */
export function NoLift() {
  const play = usePlay();
  const hydrated = useHydrated();
  const game = current(play);

  useLeaveGuard("no-lift", { ask: false, detail: "", end: () => actPlay({ type: "list" }) });

  // The server and the first paint don't know the saved screen (the list or a drawing),
  // so they show neither rather than flash the wrong one.
  if (!hydrated) return null;
  return play.view === "draw" && game ? <Drawing key={game.id} game={game} /> : <PatternList />;
}
