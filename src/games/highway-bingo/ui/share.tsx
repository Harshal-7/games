"use client";

import { readCode } from "../logic/code";
import type { Game } from "../logic/room";
import { WheelIcon } from "./marks";
import { act } from "./use-room";

/** The code, big, for the car to copy: own phones only, on the phone that started (or any phone, from its card). */
export function Share({ game, started }: { game: Game; started: boolean }) {
  const read = readCode(game.code);
  const size = read.ok ? read.code.size : 5;
  const seat = game.seats[0];

  return (
    <div className="hb-share">
      <header className="hb-form-head">
        <h1 className="game-title hb-screen-title">{seat === 1 ? "Your game's code" : "This game's code"}</h1>
      </header>

      <div className="card hb-code-card">
        <span className="hb-code" aria-label={game.code.split("").join(" ")}>
          {game.code}
        </span>
        <span className="hb-code-meta">
          {size}×{size} card · you&apos;re seat {seat}
        </span>
      </div>

      <ol className="hb-steps">
        <li>Everyone opens Highway Bingo on their own phone and taps Join.</li>
        <li>
          They type <b>{game.code}</b> and a seat number: 2, 3, 4… No two the same.
        </li>
        <li>Spot something on your card, tap it. The first full line wins.</li>
      </ol>

      <p className="hb-note">
        <WheelIcon width={20} height={20} />
        <span>Driver? Call it out, someone else taps.</span>
      </p>
      <p className="hb-share-offline">
        No signal? Fine, on any phone that has opened the game once before.
      </p>

      <button type="button" className="btn btn-primary btn-big" onClick={() => act({ type: "share", on: false })}>
        {started ? "Back to my card" : "Show my card"}
      </button>
    </div>
  );
}
