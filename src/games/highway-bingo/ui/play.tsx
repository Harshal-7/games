"use client";

import { useMemo, useState } from "react";

import { Stamp } from "@/party/ui/parts";
import { Confirm } from "@/ui/confirm";
import { RestartIcon } from "@/ui/icons";

import { deal, progress, type Progress } from "../logic/card";
import { readCode } from "../logic/code";
import { marksOf, seatName, standings, type Game, type Room } from "../logic/room";
import { BingoCard } from "./bingo-card";
import { CheckCard } from "./check";
import { CheckCardIcon } from "./marks";
import { bingoSound, stampSound, unstampSound } from "./sounds";
import { act } from "./use-room";

/** The card (or two, left against right) with the bingo when it comes. */
export function Play({ room, game }: { room: Room; game: Game }) {
  const read = readCode(game.code);
  const code = read.ok ? read.code : null;
  const cards = useMemo(() => {
    const r = readCode(game.code);
    return r.ok ? game.seats.map((seat) => deal(r.code, seat)) : [];
  }, [game.code, game.seats]);
  const stand = standings(room);
  const [fresh, setFresh] = useState<{ seat: number; cell: number } | null>(null);
  const [checking, setChecking] = useState<number | null>(null);
  const [ending, setEnding] = useState(false);
  if (!code) return null;

  if (checking !== null) {
    return <CheckCard code={game.code} seat={checking} onSeat={setChecking} onDone={() => setChecking(null)} />;
  }

  const winners = stand.filter((s) => s.won);
  const full = game.goal === "full";
  const sides = game.mode === "sides";

  function mark(seat: number, cell: number) {
    const before = marksOf(room, game.code, seat);
    const adding = !before.includes(cell);
    if (room.options.sound) {
      const after = progress(code!.size, adding ? [...before, cell] : before.filter((m) => m !== cell));
      const was = progress(code!.size, before);
      const wins = full ? after.full && !was.full : after.done.length > 0 && was.done.length === 0;
      if (wins) bingoSound();
      else if (adding) stampSound();
      else unstampSound();
    }
    setFresh(adding ? { seat, cell } : null);
    act({ type: "mark", seat, cell });
  }

  return (
    <div className={sides ? "hb-play is-sides" : "hb-play"}>
      <header className="hb-play-head">
        {game.mode === "own" ? (
          <>
            <button
              type="button"
              className="hb-code-chip"
              onClick={() => act({ type: "share", on: true })}
              aria-label={`Code ${game.code}, seat ${game.seats[0]}. Show the code big.`}
            >
              <span className="hb-code-chip-code">{game.code}</span>
              <span className="hb-code-chip-seat">Seat {game.seats[0]}</span>
            </button>
            <button type="button" className="btn hb-small" onClick={() => setChecking(game.seats[0] === 1 ? 2 : 1)}>
              <CheckCardIcon width={16} height={16} />
              Check a card
            </button>
          </>
        ) : sides ? (
          <div className="seg hb-side-tabs" role="radiogroup" aria-label="Which side's card">
            {stand.map((s, i) => (
              <button
                key={s.seat}
                type="button"
                role="radio"
                aria-checked={game.side === i}
                onClick={() => act({ type: "side", side: i })}
              >
                {i === 0 ? "◀ Left" : "Right ▶"}
                <span className="hb-tab-count">{s.won ? "★" : s.progress.marked}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="hb-play-title">One card for the whole car</p>
        )}
      </header>

      <div className="hb-sheets">
        {stand.map((s, i) => {
          const name = seatName(game, s.seat);
          const shown = !sides || game.side === i;
          return (
            <section key={s.seat} className={shown ? "hb-sheet is-shown" : "hb-sheet"} aria-label={name}>
              {sides && <h2 className="hb-sheet-name">{name}</h2>}
              <BingoCard
                card={cards[i]}
                marks={marksOf(room, game.code, s.seat)}
                lit={s.won || full ? s.progress.done : []}
                onMark={(cell) => mark(s.seat, cell)}
                fresh={fresh?.seat === s.seat ? fresh.cell : null}
                onFresh={() => setFresh(null)}
                label={game.mode === "own" ? `Seat ${s.seat}'s card` : `${name}'s card`}
              />
              {/* Below the card, so the squares never move under a finger when a line finishes. */}
              {s.won ? <Win game={game} seat={s.seat} full={full} /> : <Status progress={s.progress} full={full} />}
            </section>
          );
        })}
      </div>

      <div className="hb-foot">
        {winners.length > 0 && !full && (
          <button type="button" className="btn btn-primary btn-big" onClick={() => act({ type: "play-on" })}>
            Play on to a full card
          </button>
        )}
        {winners.length > 0 && full ? (
          <button type="button" className="btn btn-primary btn-big" onClick={() => act({ type: "end" })}>
            New game
          </button>
        ) : winners.length > 0 ? (
          <button type="button" className="btn hb-small" onClick={() => act({ type: "end" })}>
            <RestartIcon width={15} height={15} strokeWidth={2.6} />
            New game
          </button>
        ) : ending ? (
          <Confirm
            title="End this game?"
            detail={
              game.mode === "own"
                ? `Your marks stay on this phone: join ${game.code} as seat ${game.seats[0]} to pick up where you left off.`
                : "Back to the start, for a new card."
            }
            yes="End game"
            no="Keep playing"
            onNo={() => setEnding(false)}
            onYes={() => act({ type: "end" })}
          />
        ) : (
          <button type="button" className="btn hb-small" onClick={() => setEnding(true)}>
            <RestartIcon width={15} height={15} strokeWidth={2.6} />
            End game
          </button>
        )}
      </div>
    </div>
  );
}

/** The bingo, over the card: a stamp, and the code and seat so anyone can check it. */
function Win({ game, seat, full }: { game: Game; seat: number; full: boolean }) {
  const shout = full ? "Full card!" : "Bingo!";
  return (
    <div className="hb-win" role="status">
      <Stamp className="hb-win-stamp">{shout}</Stamp>
      <p className="hb-win-text">
        {game.mode === "own" ? (
          <>
            <b className="hb-win-code">
              {game.code} · Seat {seat}
            </b>
            <span>Show this screen. Anyone can check it with Check a card.</span>
          </>
        ) : game.mode === "sides" ? (
          <>
            <b>{seatName(game, seat)} {full ? "filled the card" : "got a line"}.</b>
            <span>{full ? "Every square spotted." : "First full line wins."}</span>
          </>
        ) : (
          <>
            <b>{full ? "The car spotted everything." : "The car got a line."}</b>
            <span>{full ? "Every square on the card." : "Play on for the whole card?"}</span>
          </>
        )}
      </p>
    </div>
  );
}

function Status({ progress, full }: { progress: Progress; full: boolean }) {
  const { marked, toGo, left } = progress;
  let text: string;
  if (full) text = `Playing on: ${marked} spotted · ${left} more for a full card`;
  else if (marked === 0) text = "Spot something on the card? Tap it.";
  else text = `${marked} spotted · ${toGo} more for a line`;
  return (
    <p className="hb-status" aria-live="polite">
      {text}
    </p>
  );
}
