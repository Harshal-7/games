"use client";

import { useState } from "react";

import { CheckIcon } from "@/ui/icons";

import { cryptoRandom } from "../logic/random";
import { startProblem, verdict, type Room, type Round } from "../logic/room";
import { Face, imposterFace, listNames, namesOf, PlayHead, Stamp, wordFace } from "./parts";
import { act } from "./use-room";

/** The table points, someone taps the suspect(s). Never shows the word or the imposters. */
export function Vote({ room, round }: { room: Room; round: Round }) {
  const [picked, setPicked] = useState<string[]>([]);
  const names = namesOf(room);
  const k = round.imposters.length;
  const toggle = (id: string) =>
    setPicked((now) => (now.includes(id) ? now.filter((p) => p !== id) : [...now, id].slice(-k)));

  return (
    <div className="imp-play">
      <PlayHead round={round.number} label="Vote" />
      <div className="imp-stage is-left">
        <h2 className="imp-title">{k === 1 ? "Who's the imposter?" : `Who are the ${k} imposters?`}</h2>
        <p className="imp-help">
          Count to three and everyone points at once. Tap the {k === 1 ? "player" : `${k} players`} with the most
          fingers on them.
        </p>
        <div className="imp-picks" role="group" aria-label="Suspects">
          {round.seats.map((id) => {
            const on = picked.includes(id);
            return (
              <button key={id} type="button" className="btn imp-pick" aria-pressed={on} onClick={() => toggle(id)}>
                {on && <CheckIcon width={18} height={18} strokeWidth={3} />}
                <span>{names[id]}</span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          className="btn btn-primary btn-big imp-reveal-go"
          disabled={picked.length !== k}
          onClick={() => act({ type: "accuse", ids: picked })}
        >
          {picked.length === k ? "Reveal" : k === 1 ? "Pick a player" : `Pick ${k - picked.length} more`}
        </button>
        <button type="button" className="btn imp-keep-talking" onClick={() => act({ type: "talk" })}>
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
      <PlayHead round={round.number} label="Last chance" />
      <div className="imp-stage">
        <div className="card imp-case">
          <span className="label">Case file · Round {round.number}</span>
          <span className={who.length > 9 ? "imp-case-name is-long" : "imp-case-name"}>{who}</span>
          <Stamp className="imp-case-stamp">Caught!</Stamp>
        </div>
        <h2 className="imp-title imp-guess-title">
          {who} {one ? "was the imposter" : "were the imposters"}
        </h2>
        {!shown ? (
          <>
            <p className="imp-help">
              One last chance to steal the round: {who}, say your guess for the word out loud. Then show it.
            </p>
            <button type="button" className="btn btn-primary btn-big imp-show-go" onClick={() => setShown(true)}>
              Show the word
            </button>
          </>
        ) : (
          <>
            <div className="imp-face is-wide">
              <Face {...wordFace(round)} />
            </div>
            {room.options.clue === "hint" && (
              <p className="imp-hint-line">
                Their hint: <strong>{round.hint}</strong>
              </p>
            )}
            <p className="imp-ask">Did {one ? "they" : "any of them"} get it?</p>
            <div className="imp-pair">
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

/** Who won, both sides of the cards, points and the next round. */
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

  // Highest score first; ties keep seating order and share a place (1, 2, 2, 4).
  const table = round.seats
    .map((id, seat) => ({ id, seat, score: room.scores[id] ?? 0 }))
    .sort((a, b) => b.score - a.score || a.seat - b.seat);
  const place = (score: number) => table.findIndex((row) => row.score === score) + 1;
  const problem = startProblem(room);

  return (
    <div className="imp-play">
      <PlayHead round={round.number} label="Result" />
      <div className="imp-result-head">
        <span className="imp-badge" data-winner={winner}>
          {winner === "crew" ? "Crew" : one ? "Imposter" : "Imposters"}
        </span>
        <h2 className="imp-headline">{headline}</h2>
        <p className="imp-help">{detail}</p>
      </div>

      <div className="imp-reveal" role="group" aria-label="The cards">
        <figure>
          <div className="imp-face is-small">
            <Face {...wordFace(round)} />
          </div>
          <figcaption>The word</figcaption>
        </figure>
        {round.imposters.map((id) => (
          <figure key={id}>
            <div className="imp-face is-small">
              <Face {...imposterFace(round, room.options.clue)} />
              {round.accused.includes(id) && <Stamp className="imp-card-stamp">Caught!</Stamp>}
            </div>
            <figcaption>{names[id]}&apos;s card</figcaption>
          </figure>
        ))}
      </div>

      <section className="card imp-scores" aria-labelledby="imp-scores-title">
        <div className="imp-scores-head">
          <h3 className="label" id="imp-scores-title">
            Scores
          </h3>
          <span>
            after {room.played} {room.played === 1 ? "round" : "rounds"}
          </span>
        </div>
        <ol>
          {table.map(({ id, score }) => {
            const gained = round.points[id] ?? 0;
            const turns = room.ledger[id]?.taken ?? 0;
            return (
              <li key={id}>
                <span className="imp-rank" aria-hidden="true">
                  {place(score)}
                </span>
                <span className="imp-score-name">{names[id]}</span>
                {turns > 0 && <span className="imp-turns-chip">imposter {turns}×</span>}
                <span className="imp-score-end">
                  {gained > 0 && <span className="imp-gain">+{gained}</span>}
                  <span className="imp-total">
                    {score}
                    <span className="imp-visually-hidden"> points</span>
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      <div className="imp-pair imp-result-go">
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
  );
}
