"use client";

import { useHydrated } from "@/party/ui/use-hydrated";
import { useWakeLock } from "@/party/ui/wake-lock";
import { useLeaveGuard } from "@/ui/leave-guard";

import { underway } from "../logic/room";
import { Lobby } from "./lobby";
import { Play } from "./play";
import { Share } from "./share";
import { act, useRoom } from "./use-room";

import "@/party/ui/party.css";
import "./highway-bingo.css";

/** The whole game: the lobby, the code to share, then the card. */
export function HighwayBingo() {
  const room = useRoom();
  const hydrated = useHydrated();
  const game = room.game;
  useLeaveGuard("highway-bingo", {
    ask: underway(room),
    detail:
      game?.mode === "own"
        ? `This game ends on this phone. Your marks stay: join ${game.code} as seat ${game.seats[0]} to pick up where you left off.`
        : "This game ends here, and its card is put away.",
    end: () => act({ type: "end" }),
  });
  useWakeLock(hydrated && game !== null && room.options.awake);

  // Saved in this browser only; draw nothing until it's loaded so a card doesn't flash the lobby first.
  if (!hydrated) return <div className="hb-loading" aria-busy="true" />;
  if (!game) return <Lobby room={room} />;
  if (game.sharing) return <Share game={game} started={underway(room)} />;
  return <Play room={room} game={game} />;
}
