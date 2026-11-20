"use client";

import { useState } from "react";

import { cryptoRandom } from "../logic/random";
import { startProblem, verdict, type Room, type Round } from "../logic/room";
import { Answer, listNames, namesOf } from "./parts";
import { act } from "./use-room";

/** The table points, someone taps the suspect(s). */
export function Vote({ room, round }: { room: Room; round: Round }) {
  const [picked, setPicked] = useState<string[]>([]);
  const names = namesOf(room);
  const k = round.imposters.length;
  const toggle = (id: string) =>
    setPicked((now) => (now.includes(id) ? now.filter((p) => p !== id) : [...now, id].slice(-k)));

  return (
    <div className="imp-play">
      <div className="imp-play-head">
        <span>Round {round.number}</span>
        <span>Vote</span>
      </div>
      <div className="imp-screen">
        <h2 className="imp-title">{k === 1 ? "Who's the imposter?" : `Who are the ${k} imposters?`}</h2>
        <p className="imp-help">
          Count to three and everyone points at once. Tap the {k === 1 ? "player" : `${k} players`} with the most
          fingers on them.
        </p>
        <div className="imp-suspects" role="group" aria-label="Suspects">
          {round.seats.map((id) => (
            <button
              key={id}
              type="button"
              className="imp-suspect"
              aria-pressed={picked.includes(id)}
              onClick={() => toggle(id)}
            >
              {names[id]}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="btn btn-primary imp-big"
          disabled={picked.length !== k}
          onClick={() => act({ type: "accuse", ids: picked })}
        >
          {picked.length === k ? `Reveal` : k === 1 ? "Pick a player" : `Pick ${k - picked.length} more`}
        </button>
        <button type="button" className="btn btn-quiet" onClick={() => act({ type: "talk" })}>
          Keep talking
        </button>
      </div>
    </div>
  );
}

/** Every imposter was caught: they get one guess at the word. */
export function Guess({ room, round }: { room: Room; round: Round }) {
  const [shown, setShown] = useState(false);
  const names = namesOf(room);
  const who = listNames(round.imposters.map((id) => names[id]));
  const one = round.imposters.length === 1;

  return (
    <div className="imp-play">
      <div className="imp-play-head">
        <span>Round {round.number}</span>
        <span>Last chance</span>
      </div>
      <div className="imp-screen">
        <span className="imp-badge">Caught</span>
        <h2 className="imp-title">
          {who} {one ? "was the imposter" : "were the imposters"}
        </h2>
        {!shown ? (
          <>
            <p className="imp-help">
              One last chance to steal the round: {who}, say your guess for the word out loud. Then show it.
            </p>
            <button type="button" className="btn btn-primary imp-big" onClick={() => setShown(true)}>
              Show the word
            </button>
          </>
        ) : (
          <>
            <Answer round={round} names={names} />
            <p className="imp-help">Did {one ? "they" : "any of them"} get it?</p>
            <div className="imp-row imp-row-fill">
              <button type="button" className="btn" onClick={() => act({ type: "guess", correct: false })}>
                No, missed it
              </button>
              <button type="button" className="btn btn-primary" onClick={() => act({ type: "guess", correct: true })}>
                Yes, got it
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** Who won, the answer, points and the next round. */
export function Result({ room, round }: { room: Room; round: Round }) {
  const names = namesOf(room);
  const { winner, how } = verdict(round);
  const imposters = round.imposters.map((id) => names[id]);
  const who = listNames(imposters);
  const one = imposters.length === 1;
  const wrong = round.accused.filter((id) => !round.imposters.includes(id)).map((id) => names[id]);

  const headline =
    how === "caught" ? "Crew wins" : how === "guessed" ? `${who} stole it` : one ? `${who} got away` : "The imposters got away";
  const detail =
    how === "caught"
      ? `Caught ${who}, and the word stayed safe.`
      : how === "guessed"
        ? `Caught, but ${one ? "guessed" : "they guessed"} the word.`
        : `You voted for ${listNames(wrong)}, who ${wrong.length === 1 ? "wasn't" : "weren't"} the imposter.`;

  // Highest score first; ties keep seating order.
  const table = round.seats
    .map((id, seat) => ({ id, seat, score: room.scores[id] ?? 0 }))
    .sort((a, b) => b.score - a.score || a.seat - b.seat);
  const problem = startProblem(room);

  return (
    <div className="imp-play">
      <div className="imp-play-head">
        <span>Round {round.number}</span>
        <span>Result</span>
      </div>
      <div className="imp-screen imp-result" data-winner={winner}>
        <span className="imp-badge">{winner === "crew" ? "Crew" : one ? "Imposter" : "Imposters"}</span>
        <h2 className="imp-title">{headline}</h2>
        <p className="imp-help">{detail}</p>
        <Answer round={round} names={names} />

        <ol className="imp-scores" aria-label="Scores">
          {table.map(({ id, score }) => {
            const gained = round.points[id] ?? 0;
            const turns = room.ledger[id]?.taken ?? 0;
            return (
              <li key={id}>
                <span className="imp-scores-name">
                  {names[id]}
                  {turns > 0 && <span className="imp-scores-turns">imposter {turns}×</span>}
                </span>
                {gained > 0 && <span className="imp-gain">+{gained}</span>}
                <span className="imp-scores-total">{score}</span>
              </li>
            );
          })}
        </ol>

        <div className="imp-row imp-row-fill">
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
            Next round
          </button>
        </div>
      </div>
    </div>
  );
}
