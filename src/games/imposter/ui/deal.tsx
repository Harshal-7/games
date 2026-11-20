"use client";

import { useState } from "react";

import { CheckIcon, ShuffleIcon } from "@/ui/icons";

import { cryptoRandom } from "../logic/random";
import type { Room, Round } from "../logic/room";
import { HoldCard } from "./hold-card";
import { Confirm, namesOf, SecretFace } from "./parts";
import { act } from "./use-room";

type Ask = "redeal" | "leave" | null;

/**
 * Passing the phone round. Two screens per player: "pass the phone to Riya", then
 * Riya's own sealed card. Nobody can open a card from the pass screen, a card can't
 * be closed back up, and an opened card can't go back to the pass screen, so any
 * peek at someone else's card shows when its owner gets the phone.
 */
export function Deal({ room, round }: { room: Room; round: Round }) {
  const [ask, setAsk] = useState<Ask>(null);
  const names = namesOf(room);
  const id = round.seats[round.turn];
  const name = names[id];
  const next = round.seats[round.turn + 1];
  const opens = round.opens[id] ?? 0;

  return (
    <div className="imp-play">
      <div className="imp-play-head">
        <span>Round {round.number}</span>
        <span>
          Card {round.turn + 1} of {round.seats.length}
        </span>
      </div>
      <ol className="imp-turns" aria-label="Who has seen their card">
        {round.seats.map((seat, i) => (
          <li key={seat} data-state={i < round.turn ? "done" : i === round.turn ? "now" : "next"}>
            {i < round.turn && <CheckIcon width={12} height={12} strokeWidth={3} />}
            {names[seat]}
          </li>
        ))}
      </ol>

      {!round.looking ? (
        <div className="imp-screen" key={`pass-${id}`}>
          <p className="imp-kicker">Pass the phone to</p>
          <h2 className="imp-name">{name}</h2>
          <p className="imp-help">Only {name} looks. Everyone else, eyes off the screen.</p>
          <button type="button" className="btn btn-primary imp-big" onClick={() => act({ type: "look" })}>
            I&apos;m {name}
          </button>
        </div>
      ) : (
        <div className="imp-screen" key={`card-${id}-${round.word}`}>
          <p className="imp-kicker">{name}&apos;s card</p>
          <HoldCard name={name} opens={opens} onOpen={() => act({ type: "open", id })}>
            <SecretFace round={round} id={id} clue={room.options.clue} />
          </HoldCard>
          {opens === 0 ? (
            <button type="button" className="btn btn-quiet" onClick={() => act({ type: "back" })}>
              Not {name}? Go back
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary imp-big"
              onClick={() => act({ type: "done", now: Date.now() })}
            >
              {next ? `Done, pass to ${names[next]}` : "Done, start talking"}
            </button>
          )}
        </div>
      )}

      {ask === "redeal" ? (
        <Confirm
          title="Re-deal for everyone?"
          detail="Use this if someone saw a card that wasn't theirs. Everyone gets a new word and the imposter changes."
          yes="Re-deal"
          onNo={() => setAsk(null)}
          onYes={() => {
            act({ type: "redeal", rng: cryptoRandom });
            setAsk(null);
          }}
        />
      ) : ask === "leave" ? (
        <Confirm
          title="Stop this round?"
          detail="Back to players and options. This round won't count."
          yes="Stop round"
          onNo={() => setAsk(null)}
          onYes={() => act({ type: "lobby" })}
        />
      ) : (
        <div className="imp-foot">
          <button type="button" className="btn btn-quiet imp-small" onClick={() => setAsk("redeal")}>
            <ShuffleIcon width={16} height={16} />
            Someone peeked? Re-deal
          </button>
          <button type="button" className="btn btn-quiet imp-small" onClick={() => setAsk("leave")}>
            Change players
          </button>
        </div>
      )}
    </div>
  );
}
