"use client";

import { useHydrated } from "@/party/ui/use-hydrated";
import { useLeaveGuard } from "@/ui/leave-guard";

import { Deal } from "./deal";
import { Lobby } from "./lobby";
import { Answer, Reveal } from "./questions";
import { Talk } from "./talk";
import { act, useRoom } from "./use-room";
import { Guess, Result, Vote } from "./verdict";

import "@/party/ui/party.css";
import "./imposter.css";

/** The whole game: the lobby between rounds, then one screen per stage of a round. */
export function Imposter() {
  const room = useRoom();
  const hydrated = useHydrated();
  const round = room.round;
  useLeaveGuard("imposter", {
    ask: round !== null || room.played > 0,
    detail: "This game ends here, and its scores are cleared. Your players stay for next time.",
    end: () => act({ type: "new-room" }),
  });

  // The room is saved in this browser only; draw nothing until it's loaded so a
  // round in progress doesn't flash the lobby first.
  if (!hydrated) return <div className="imp-loading" aria-busy="true" />;
  if (!round) return <Lobby room={room} />;

  // A new key per stage, so each screen starts with fresh local state.
  const key = `${round.number}-${round.stage}`;
  switch (round.stage) {
    case "deal":
      return <Deal key={key} room={room} round={round} />;
    case "answer":
      return round.mode === "questions" ? <Answer key={key} room={room} round={round} /> : null;
    case "reveal":
      return round.mode === "questions" ? <Reveal key={key} room={room} round={round} /> : null;
    case "talk":
      return <Talk key={key} room={room} round={round} />;
    case "vote":
      return <Vote key={key} room={room} round={round} />;
    case "guess":
      return round.mode === "words" ? <Guess key={key} room={room} round={round} /> : null;
    case "result":
      return <Result key={key} room={room} round={round} />;
  }
}
