"use client";

import { Deal } from "./deal";
import { Lobby } from "./lobby";
import { useHydrated } from "./parts";
import { Talk } from "./talk";
import { useRoom } from "./use-room";
import { Guess, Result, Vote } from "./verdict";

import "./imposter.css";

/** The whole game: the lobby between rounds, then one screen per stage of a round. */
export function Imposter() {
  const room = useRoom();
  const hydrated = useHydrated();
  const round = room.round;

  // The room is saved in this browser only; draw nothing until it's loaded so a
  // round in progress doesn't flash the lobby first.
  if (!hydrated) return <div className="imp-loading" aria-busy="true" />;
  if (!round) return <Lobby room={room} />;

  // A new key per stage, so each screen starts with fresh local state.
  const key = `${round.number}-${round.stage}`;
  switch (round.stage) {
    case "deal":
      return <Deal key={key} room={room} round={round} />;
    case "talk":
      return <Talk key={key} room={room} round={round} />;
    case "vote":
      return <Vote key={key} room={room} round={round} />;
    case "guess":
      return <Guess key={key} room={room} round={round} />;
    case "result":
      return <Result key={key} room={room} round={round} />;
  }
}
