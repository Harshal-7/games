"use client";

import { deal } from "../logic/card";
import { readCode } from "../logic/code";
import { BingoCard } from "./bingo-card";
import { SeatStepper } from "./code-form";

/**
 * Check a card: any seat's card from the code, without marks, to hold up next to a
 * "Bingo!" claim. Whether the sights were really spotted is up to the car.
 */
export function CheckCard({
  code,
  seat,
  onSeat,
  onDone,
}: {
  code: string;
  seat: number;
  onSeat: (seat: number) => void;
  onDone: () => void;
}) {
  const read = readCode(code);
  if (!read.ok) return null;
  const card = deal(read.code, seat);

  return (
    <div className="hb-check">
      <header className="hb-form-head">
        <h1 className="game-title hb-screen-title">Check a card</h1>
      </header>
      <p className="game-blurb hb-form-blurb">Same squares as their screen? Then it&apos;s their real card.</p>

      <div className="hb-check-head">
        <span className="hb-code-chip is-still">
          <span className="hb-code-chip-code">{code}</span>
          <span className="hb-code-chip-seat">Seat {seat}</span>
        </span>
        <SeatStepper value={seat} onChange={onSeat} label="Seat" />
      </div>

      <BingoCard card={card} marks={[]} label={`Seat ${seat}'s card, ${code}`} />

      <button type="button" className="btn btn-primary btn-big hb-check-done" onClick={onDone}>
        Done
      </button>
    </div>
  );
}
