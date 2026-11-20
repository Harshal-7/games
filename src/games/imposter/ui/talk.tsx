"use client";

import { useState } from "react";

import { HoldCard } from "@/party/ui/hold-card";
import { BigName, PlayHead } from "@/party/ui/parts";
import { RingTimer } from "@/party/ui/ring-timer";
import { Confirm } from "@/ui/confirm";
import { EyeOffIcon } from "@/ui/icons";

import { TALK_MS, type Room, type Round } from "../logic/room";
import { listNames, namesOf, SecretFace } from "./parts";
import { act } from "./use-room";

type Check = null | "pick" | { id: string };

/** Talking: who starts, the timer, then on to the vote. Never shows the word, hint or imposters. */
export function Talk({ room, round }: { room: Room; round: Round }) {
  const [check, setCheck] = useState<Check>(null);
  const [leaving, setLeaving] = useState(false);
  const names = namesOf(room);
  const imposters = round.imposters.length;
  const starter = names[round.starter];
  const question = round.mode === "questions" ? round.question.crew : null;

  if (check !== null) return <Recheck room={room} round={round} check={check} onChange={setCheck} />;

  return (
    <div className="party-play">
      <PlayHead round={round.number} label={imposters === 1 ? "1 imposter" : `${imposters} imposters`} />
      <div className="party-stage">
        <p className="imp-talk-kicker">Put the phone down. First up:</p>
        <div className="imp-first">
          <BigName name={starter} />
          <span className="imp-first-chip" aria-hidden="true">
            1st
          </span>
        </div>
        {question === null ? (
          <p className="party-help imp-talk-help">
            Then go round the circle. Everyone says one word about the secret word. Too obvious and the imposter
            catches on; too vague and you look like the imposter.
          </p>
        ) : (
          <>
            <p className="party-help imp-talk-help">
              Go round the circle: say your answer and why. The one with the odd question has to talk their way out.
            </p>
            <div className="card imp-talk-question">
              <span className="label">The question</span>
              <span className="imp-talk-question-text">{question}</span>
            </div>
          </>
        )}
        {round.timer && (
          <RingTimer
            timer={round.timer}
            total={TALK_MS}
            sound={room.options.sound}
            onTimer={(op, now) => act({ type: "timer", op, now })}
          />
        )}
        <button type="button" className="btn btn-primary btn-big imp-vote-go" onClick={() => act({ type: "vote" })}>
          Time to vote
        </button>
        {round.rechecks.length > 0 && (
          <p className="imp-log" role="status">
            <EyeOffIcon width={16} height={16} />
            <span>
              Looked at their card again: <strong>{listNames(summarise(round.rechecks.map((id) => names[id])))}</strong>
            </span>
          </p>
        )}
      </div>

      {leaving ? (
        <Confirm
          title="End this round?"
          detail="Nobody gets points. The imposter stays a secret."
          yes="End round"
          onNo={() => setLeaving(false)}
          onYes={() => act({ type: "lobby" })}
        />
      ) : (
        <div className="party-foot">
          {/* Questions mode has the real question on screen; only the imposter would ever
              look again, and everyone would see who did. */}
          {question === null && (
            <button type="button" className="btn" onClick={() => setCheck("pick")}>
              Forgot your word?
            </button>
          )}
          <button type="button" className={question === null ? "btn" : "btn imp-solo"} onClick={() => setLeaving(true)}>
            End round
          </button>
        </div>
      )}
    </div>
  );
}

/** "Riya", "Aman ×2" from a list with repeats, in first-seen order. */
function summarise(names: string[]): string[] {
  const counts = new Map<string, number>();
  for (const name of names) counts.set(name, (counts.get(name) ?? 0) + 1);
  return [...counts].map(([name, n]) => (n > 1 ? `${name} ×${n}` : name));
}

/** Someone forgot their word: they pick their name and hold their card again. Everyone sees who did. */
function Recheck({
  room,
  round,
  check,
  onChange,
}: {
  room: Room;
  round: Round;
  check: "pick" | { id: string };
  onChange: (check: Check) => void;
}) {
  const names = namesOf(room);
  if (check === "pick") {
    return (
      <div className="party-play">
        <PlayHead round={round.number} label="Forgot your word?" />
        <div className="party-stage">
          <EyeOffIcon className="imp-forgot-mark" width={44} height={44} strokeWidth={1.6} />
          <h2 className="party-title is-big">Who are you?</h2>
          <p className="party-help">Everyone will see that you looked again.</p>
          <div className="party-picks" role="group" aria-label="Pick your name">
            {round.seats.map((id) => (
              <button key={id} type="button" className="btn party-pick" onClick={() => onChange({ id })}>
                <span>{names[id]}</span>
              </button>
            ))}
          </div>
          <button type="button" className="btn imp-never-mind" onClick={() => onChange(null)}>
            Never mind
          </button>
        </div>
      </div>
    );
  }
  const name = names[check.id];
  return (
    <div className="party-play">
      <PlayHead round={round.number} label="Forgot your word?" />
      <div className="party-stage">
        <h2 className="imp-card-kicker">{name}&apos;s card</h2>
        <HoldCard
          name={name}
          opens={round.opens[check.id] ?? 0}
          buzz={room.options.sound}
          onOpen={() => act({ type: "open", id: check.id })}
        >
          <SecretFace round={round} id={check.id} clue={room.options.clue} />
        </HoldCard>
        <button type="button" className="btn btn-primary btn-big imp-after-card" onClick={() => onChange(null)}>
          Done
        </button>
      </div>
    </div>
  );
}
