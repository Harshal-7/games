"use client";

import { readCode } from "../logic/code";
import type { Game } from "../logic/room";
import { act } from "./use-room";

/** The code, big, for the car to copy: own phones only, on the phone that started (or any phone, from its card). */
export function Share({ game, started }: { game: Game; started: boolean }) {
  const read = readCode(game.code);
  const size = read.ok ? read.code.size : 5;
  const seat = game.seats[0];

  return (
    <div className="hb-share">
      <header className="hb-form-head">
        <h1 className="game-title hb-screen-title">{seat === 1 ? "Your code" : "This game's code"}</h1>
      </header>

      <div className="card hb-code-card">
        <span className="hb-code" aria-label={game.code.split("").join(" ")}>
          {game.code}
        </span>
        <span className="hb-code-meta">
          {size}×{size} card · you&apos;re seat {seat}
        </span>
      </div>

      <p className="hb-share-how">
        Everyone else taps <b>Join</b> and types this code, with a seat number: 2, 3, 4…
      </p>

      <button type="button" className="btn btn-primary btn-big" onClick={() => act({ type: "share", on: false })}>
        {started ? "Back to my card" : "Show my card"}
      </button>
    </div>
  );
}
