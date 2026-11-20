"use client";

import { useEffect, useEffectEvent } from "react";

import { useHydrated } from "@/party/ui/use-hydrated";

import type { Room } from "../logic/game";
import { narration } from "../logic/narration";
import { Morning, Talk, Verdict, VoteScreen } from "./day";
import { Deal } from "./deal";
import { End } from "./end";
import { Lobby } from "./lobby";
import { say, useUnlocked } from "./narrator";
import { NightScreen } from "./night";
import { chime } from "./parts";
import { useRoom } from "./use-room";
import { useWakeLock } from "./wake-lock";

import "@/party/ui/party.css";
import "./mafia.css";

/** The whole game: setup between games, then one screen per stage. */
export function Mafia() {
  const room = useRoom();
  const hydrated = useHydrated();
  const game = room.game;
  // The screen stays on from the first night to the last vote.
  useWakeLock(hydrated && game !== null && game.stage !== "deal" && game.stage !== "end");
  useNarrator(room, hydrated);

  // The room is saved in this browser only; draw nothing until it's loaded so a game in
  // progress doesn't flash the setup first.
  if (!hydrated) return <div className="maf-loading" aria-busy="true" />;
  if (!game) return <Lobby room={room} />;

  // A new key per stage and day, so each screen starts with fresh local state.
  const key = `${game.number}-${game.round}-${game.stage}`;
  switch (game.stage) {
    case "deal":
      return <Deal key={key} room={room} game={game} />;
    case "night":
      return <NightScreen key={key} room={room} game={game} />;
    case "morning":
      return <Morning key={key} room={room} game={game} />;
    case "day":
      return <Talk key={key} room={room} game={game} />;
    case "vote":
      return <VoteScreen key={key} room={room} game={game} />;
    case "verdict":
      return <Verdict key={key} room={room} game={game} />;
    case "end":
      return <End key={key} room={room} game={game} />;
  }
}

/** The last moment a chime marked, so coming back to the page doesn't chime again. */
let chimed: string | null = null;

/**
 * Says each new moment's lines once, as the game moves on (the night's calls come from
 * the clock, not a tap). With the voice off, a soft chime marks a new line instead, if
 * sound is on. Nothing is said until a tap has woken the narrator up in this page.
 */
function useNarrator(room: Room, hydrated: boolean): void {
  const unlocked = useUnlocked();
  const line = narration(room);
  const key = line?.key ?? null;
  const tell = useEffectEvent(() => {
    if (!line) return;
    if (room.options.voice) say(line.key, line.lines);
    // The night falling has its own notes, from the tap that starts it.
    else if (room.options.sound && line.key !== chimed && !line.key.endsWith(":dusk")) {
      chimed = line.key;
      chime();
    }
  });
  useEffect(() => {
    if (hydrated && unlocked && key) tell();
  }, [hydrated, unlocked, key]);
}
