"use client";

import { useEffect } from "react";

import { useHydrated } from "@/party/ui/use-hydrated";
import { useWakeLock } from "@/party/ui/wake-lock";
import { useLeaveGuard } from "@/ui/leave-guard";
import { soundLikeMedia } from "@/ui/sound";

import { winner } from "../logic/room";
import { Lobby } from "./lobby";
import { Play } from "./play";
import { act, useRoom } from "./use-room";

import "@/party/ui/party.css";
import "./patakha.css";

/** The whole game: the lobby between games, then the rounds. The screen stays on until someone wins. */
export function Patakha() {
  const room = useRoom();
  const hydrated = useHydrated();
  const game = room.game;
  useLeaveGuard("patakha", {
    ask: game !== null || room.played > 0,
    detail: "This game ends here, and its scores are cleared. Your players stay for next time.",
    end: () => act({ type: "new-room" }),
  });
  useWakeLock(hydrated && game !== null && winner(game) === null);

  // Lighting a fuse asks iPhones to play through the silent switch; leaving the game lets go of that.
  useEffect(() => () => soundLikeMedia(false), []);

  // The room is saved in this browser only; draw nothing until it's loaded so a game in
  // progress doesn't flash the lobby first.
  if (!hydrated) return <div className="pk-loading" aria-busy="true" />;
  if (!game) return <Lobby room={room} />;
  return <Play room={room} game={game} />;
}
