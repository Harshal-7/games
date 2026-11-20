"use client";

import { cryptoRandom } from "@/party/logic/random";

import { inGame, startProblem, winnerOf, type Game, type Room } from "../logic/game";
import { ROLE_NAMES } from "../logic/roles";
import { dayLogLine, nightLogLine } from "../logic/script";
import { Head, namesOf } from "./parts";
import { act } from "./use-room";

/** Who won, every card face up, what happened each night and day, and the scores. */
export function End({ room, game }: { room: Room; game: Game }) {
  const names = namesOf(room);
  const winner = winnerOf(game) ?? "town";
  const mafia = game.seats.filter((id) => game.roles[id] === "mafia");
  const problem = startProblem(room);

  const headline = winner === "town" ? "The town wins" : "The Mafia win";
  const detail =
    winner === "town"
      ? `Every Mafia is out, after ${game.round} ${game.round === 1 ? "night" : "nights"}.`
      : `The Mafia matched everyone else after ${game.round} ${game.round === 1 ? "night" : "nights"}.`;

  // Night 1, Day 1, Night 2… A day only happened if its vote did: the game can end on a morning.
  const lastDay = game.out.some((e) => e.when === "day" && e.round === game.round) ? game.round : game.round - 1;
  const log: string[] = [];
  for (const night of game.log) {
    log.push(
      nightLogLine(night, (id) => names[id], (id) => game.roles[id] === "mafia", {
        doctor: inGame(game, "doctor"),
        police: inGame(game, "police"),
      }),
    );
    if (night.round <= lastDay) {
      const out = game.out.find((e) => e.when === "day" && e.round === night.round);
      log.push(dayLogLine(night.round, out ? { name: names[out.id], role: game.roles[out.id] } : null));
    }
  }

  // Highest score first; ties keep seating order and share a place (1, 2, 2, 4).
  const table = game.seats
    .map((id, seat) => ({ id, seat, score: room.scores[id] ?? 0 }))
    .sort((a, b) => b.score - a.score || a.seat - b.seat);
  const place = (score: number) => table.findIndex((row) => row.score === score) + 1;

  return (
    <div className="party-play maf-end">
      <Head chip={`Game ${game.number}`} label="The end" />
      <div className="maf-result-head">
        <span className="maf-badge" data-winner={winner}>
          {winner === "town" ? "Town" : mafia.length === 1 ? "Mafia" : "The Mafia"}
        </span>
        <h2 className="maf-headline">{headline}</h2>
        <p className="party-help">{detail}</p>
      </div>

      <ul className="maf-cards" aria-label="Every card">
        {game.seats.map((id) => {
          const role = game.roles[id];
          const out = game.out.find((e) => e.id === id);
          return (
            <li key={id}>
              <div className="party-face is-small maf-mini" data-role={role}>
                <span className="party-face-word">{ROLE_NAMES[role]}</span>
                <span className="maf-mini-when">
                  {out ? `Out, ${out.when} ${out.round}` : "Still in"}
                </span>
              </div>
              <span className="maf-mini-name">{names[id]}</span>
            </li>
          );
        })}
      </ul>

      <section className="card maf-log" aria-labelledby="maf-log-title">
        <h3 className="label" id="maf-log-title">
          What happened
        </h3>
        <ol>
          {log.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ol>
      </section>

      <section className="card maf-scores" aria-labelledby="maf-scores-title">
        <div className="maf-scores-head">
          <h3 className="label" id="maf-scores-title">
            Scores
          </h3>
          <span>
            after {room.played} {room.played === 1 ? "game" : "games"}
          </span>
        </div>
        <ol>
          {table.map(({ id, score }) => {
            const gained = game.points[id] ?? 0;
            const turns = room.ledgers.mafia[id]?.taken ?? 0;
            return (
              <li key={id}>
                <span className="maf-rank" aria-hidden="true">
                  {place(score)}
                </span>
                <span className="maf-score-name">{names[id]}</span>
                {turns > 0 && <span className="maf-turns-chip">Mafia {turns}×</span>}
                <span className="maf-score-end">
                  {gained > 0 && <span className="maf-gain">+{gained}</span>}
                  <span className="maf-total">
                    {score}
                    <span className="party-visually-hidden"> points</span>
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      <div className="maf-pair maf-result-go">
        <button type="button" className="btn" onClick={() => act({ type: "lobby" })}>
          Players &amp; options
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={problem !== null}
          onClick={() => {
            act({ type: "lobby" });
            act({ type: "start", rng: cryptoRandom });
          }}
        >
          Play again
        </button>
      </div>
    </div>
  );
}
