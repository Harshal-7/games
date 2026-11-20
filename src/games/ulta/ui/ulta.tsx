"use client";

import { useEffect } from "react";

import { useHydrated } from "@/party/ui/use-hydrated";
import { useWakeLock } from "@/party/ui/wake-lock";
import { useLeaveGuard } from "@/ui/leave-guard";

import { Lobby } from "./lobby";
import { setAudioSession } from "./mic";
import { Play } from "./play";
import { stopPlaying } from "./player";
import { dropTakes } from "./takes";
import { act, useRoom } from "./use-room";

import "@/party/ui/party.css";
import "./ulta.css";

/** The whole game: players, teams and options between games, then the turns. The screen stays on while playing. */
export function Ulta() {
  const room = useRoom();
  const hydrated = useHydrated();
  const game = room.game;
  useLeaveGuard("ulta", {
    ask: game !== null && !game.over,
    detail: "This game ends here, and its scores are cleared. Your players and teams stay for next time.",
    end: () => {
      stopPlaying();
      dropTakes();
      act({ type: "lobby" });
    },
  });
  useWakeLock(hydrated && game !== null && !game.over);

  // Playing asks iPhones to play like media; leaving the game stops the sound and lets go of that.
  useEffect(
    () => () => {
      stopPlaying();
      setAudioSession("auto");
    },
    [],
  );

  // The room is saved in this browser only; draw nothing until it's loaded so a game in
  // progress doesn't flash the lobby first.
  if (!hydrated) return <div className="ul-loading" aria-busy="true" />;
  if (!game) return <Lobby room={room} />;
  return <Play room={room} game={game} />;
}
