"use client";

import { useState } from "react";

import { cryptoRandom } from "@/party/logic/random";
import { HoldCard } from "@/party/ui/hold-card";
import { BigName } from "@/party/ui/parts";
import { Confirm } from "@/ui/confirm";
import { EyeOffIcon, ShuffleIcon } from "@/ui/icons";

import type { Game, Room } from "../logic/game";
import { Head, namesOf, RoleFace } from "./parts";
import { act } from "./use-room";

type Ask = "redeal" | "leave" | null;

/**
 * Passing the phone round. Two screens per player: "pass the phone to Riya", then Riya's
 * own sealed card. Every card looks the same from outside, a card can't be closed back up,
 * and an opened card can't go back to the pass screen, so a peek always shows.
 */
export function Deal({ room, game }: { room: Room; game: Game }) {
  const [ask, setAsk] = useState<Ask>(null);
  const names = namesOf(room);
  const id = game.seats[game.turn];
  const name = names[id];
  const next = game.seats[game.turn + 1];
  const opens = game.opens[id] ?? 0;

  return (
    <div className="party-play">
      <Head chip={`Game ${game.number}`} label={`Card ${game.turn + 1} of ${game.seats.length}`} />

      {!game.looking ? (
        <div className="party-stage is-deal maf-pass" key={`pass-${id}`}>
          <span className="maf-pass-mark" aria-hidden="true">
            <EyeOffIcon width={44} height={44} strokeWidth={2} />
          </span>
          <p className="maf-pass-kicker">Pass the phone to</p>
          <BigName name={name} />
          <p className="party-help">Only {name} looks. Everyone else, eyes off the screen.</p>
          <button type="button" className="btn btn-primary btn-big" onClick={() => act({ type: "look" })}>
            I&apos;m {name}
          </button>
        </div>
      ) : (
        <div className="party-stage is-deal" key={`card-${id}`}>
          <h2 className="maf-card-kicker">{name}&apos;s card</h2>
          <HoldCard name={name} opens={opens} buzz={room.options.sound} onOpen={() => act({ type: "open", id })}>
            <RoleFace game={game} id={id} names={names} />
          </HoldCard>
          {opens === 0 ? (
            <button type="button" className="btn maf-after-card" onClick={() => act({ type: "back" })}>
              Not {name}? Go back
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary btn-big maf-after-card"
              onClick={() => act({ type: "done" })}
            >
              {next ? `Done, pass to ${names[next]}` : "Done, everyone has a role"}
            </button>
          )}
        </div>
      )}

      {ask === "redeal" ? (
        <Confirm
          title="Re-deal for everyone?"
          detail="Use this if someone saw a card that wasn't theirs. Everyone gets a new role."
          yes="Re-deal"
          onNo={() => setAsk(null)}
          onYes={() => {
            act({ type: "redeal", rng: cryptoRandom });
            setAsk(null);
          }}
        />
      ) : ask === "leave" ? (
        <Confirm
          title="Stop dealing?"
          detail="Back to players and options. This game won't count."
          yes="Stop"
          onNo={() => setAsk(null)}
          onYes={() => act({ type: "lobby" })}
        />
      ) : (
        <div className="party-foot">
          <button type="button" className="btn maf-small" onClick={() => setAsk("redeal")}>
            <ShuffleIcon width={16} height={16} strokeWidth={2.4} />
            Re-deal
          </button>
          <button type="button" className="btn maf-small" onClick={() => setAsk("leave")}>
            Change players
          </button>
        </div>
      )}
    </div>
  );
}
