"use client";

import { useEffect, useState } from "react";

import { useHydrated } from "@/party/ui/use-hydrated";
import { useWakeLock } from "@/party/ui/wake-lock";
import { useLeaveGuard } from "@/ui/leave-guard";

import { readCode } from "../logic/code";
import { underway } from "../logic/room";
import { CodeForm } from "./code-form";
import { clearLinkedCode, linkedCode } from "./join-link";
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
        ? `Your marks are kept. Join ${game.code} as seat ${game.seats[0]} to carry on.`
        : "This card goes away.",
    end: () => act({ type: "end" }),
  });
  useWakeLock(hydrated && game !== null && room.options.awake);

  // Opened from a join link: the Join screen comes up with the code filled in, once.
  const [link, setLink] = useState(linkedCode);
  useEffect(clearLinkedCode, []);
  const linked = link === null ? null : readCode(link);
  // Already playing that game on this phone: just show the card.
  if (hydrated && game && linked?.ok && linked.code.text === game.code) setLink(null);

  // Saved in this browser only; draw nothing until it's loaded so a card doesn't flash the lobby first.
  if (!hydrated) return <div className="hb-loading" aria-busy="true" />;
  if (link !== null) {
    return (
      <CodeForm
        purpose="join"
        code={link}
        onCancel={() => setLink(null)}
        onDone={(code, seat) => {
          act({ type: "join", code, seat });
          setLink(null);
        }}
      />
    );
  }
  if (!game) return <Lobby room={room} />;
  if (game.sharing) return <Share game={game} started={underway(room)} />;
  return <Play room={room} game={game} />;
}
