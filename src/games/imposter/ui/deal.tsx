"use client";

import { useState } from "react";

import { cryptoRandom } from "@/party/logic/random";
import { HoldCard } from "@/party/ui/hold-card";
import { BigName, PlayHead } from "@/party/ui/parts";
import { wakeAudio } from "@/party/ui/sounds";
import { Confirm } from "@/ui/confirm";
import { CheckIcon, EyeOffIcon, ShuffleIcon } from "@/ui/icons";

import type { Room, Round } from "../logic/room";
import { namesOf, SecretFace } from "./parts";
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
  const { sound } = room.options;

  const done = () => {
    // The last tap before talking time: wake the audio so the ticks can play later.
    if (!next && sound) wakeAudio();
    act({ type: "done", now: Date.now() });
  };

  // The main button keeps one spot on every deal screen (I'm Riya, Done, I'm Aman…), so a
  // thumb or a mouse never has to move. Before the card is opened that spot stays empty,
  // so a double tap can't skip anything; Go back sits in the row under it.
  let main = null;
  if (!round.looking) {
    main = (
      <button type="button" className="btn btn-primary btn-big" onClick={() => act({ type: "look" })}>
        I&apos;m {name}
      </button>
    );
  } else if (opens > 0) {
    main = (
      <button type="button" className="btn btn-primary btn-big" onClick={done}>
        {next ? `Done, pass to ${names[next]}` : "Done, start talking"}
      </button>
    );
  }

  return (
    <div className="party-play">
      <PlayHead round={round.number} label={`Card ${round.turn + 1} of ${round.seats.length}`} />
      <ol className="imp-turns" aria-label="Who has seen their card">
        {round.seats.map((seat, i) => {
          const state = i < round.turn ? "done" : i === round.turn ? "now" : "next";
          return (
            <li key={seat} className="imp-turn" data-state={state}>
              {state === "done" && <CheckIcon width={12} height={12} strokeWidth={3.2} />}
              {names[seat]}
              <span className="party-visually-hidden">
                {state === "done" ? ", has seen their card" : state === "now" ? ", now" : ", next"}
              </span>
            </li>
          );
        })}
      </ol>

      <div className="party-stage is-deal imp-deal">
        {!round.looking ? (
          <div className="imp-deal-body imp-pass" key={`pass-${id}`}>
            <span className="imp-pass-mark" aria-hidden="true">
              <EyeOffIcon width={44} height={44} strokeWidth={2} />
            </span>
            <p className="imp-pass-kicker">Pass the phone to</p>
            <BigName name={name} />
            <p className="party-help">Only {name} looks. Everyone else, eyes off the screen.</p>
          </div>
        ) : (
          <div className="imp-deal-body" key={`card-${id}-${round.mode === "words" ? round.word : round.question.id}`}>
            <h2 className="imp-card-kicker">{name}&apos;s card</h2>
            <HoldCard name={name} opens={opens} buzz={sound} onOpen={() => act({ type: "open", id })}>
              <SecretFace round={round} id={id} clue={room.options.clue} />
            </HoldCard>
          </div>
        )}
        <div className="imp-deal-main">{main}</div>
        <div className="imp-deal-under">
          {round.looking && opens === 0 && (
            <button type="button" className="btn imp-small" onClick={() => act({ type: "back" })}>
              Not {name}? Go back
            </button>
          )}
        </div>
      </div>

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
        <div className="party-foot">
          <button type="button" className="btn imp-small" onClick={() => setAsk("redeal")}>
            <ShuffleIcon width={16} height={16} strokeWidth={2.4} />
            Re-deal
          </button>
          <button type="button" className="btn imp-small" onClick={() => setAsk("leave")}>
            Change players
          </button>
        </div>
      )}
    </div>
  );
}
