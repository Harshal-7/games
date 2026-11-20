"use client";

import { useEffect, useState } from "react";

import { formatDuration } from "@/ui/format";
import { PauseIcon, PlayIcon, PlusIcon } from "@/ui/icons";
import { playNotes, vibrate } from "@/ui/sound";

import { timeLeft, type Room, type Round } from "../logic/room";
import { HoldCard } from "./hold-card";
import { Confirm, listNames, namesOf, SecretFace } from "./parts";
import { act } from "./use-room";
import { useClock } from "./use-clock";

type Check = null | "pick" | { id: string };

/** Talking: who starts, the timer, then on to the vote. */
export function Talk({ room, round }: { room: Room; round: Round }) {
  const [check, setCheck] = useState<Check>(null);
  const [leaving, setLeaving] = useState(false);
  const names = namesOf(room);
  const imposters = round.imposters.length;

  if (check !== null) return <Recheck room={room} round={round} check={check} onChange={setCheck} />;

  return (
    <div className="imp-play">
      <div className="imp-play-head">
        <span>Round {round.number}</span>
        <span>{imposters === 1 ? "1 imposter" : `${imposters} imposters`}</span>
      </div>
      <div className="imp-screen">
        <p className="imp-kicker">Put the phone down. First up:</p>
        <h2 className="imp-name">{names[round.starter]}</h2>
        <p className="imp-help">
          Then go round the circle. Everyone says one word about the secret word. Too obvious and the imposter
          catches on; too vague and you look like the imposter.
        </p>
        {round.timer && <Countdown room={room} round={round} />}
        <button type="button" className="btn btn-primary imp-big" onClick={() => act({ type: "vote" })}>
          Time to vote
        </button>
      </div>

      {round.rechecks.length > 0 && (
        <p className="imp-log" role="status">
          Looked at their card again: {listNames(summarise(round.rechecks.map((id) => names[id])))}
        </p>
      )}

      {leaving ? (
        <Confirm
          title="End this round?"
          detail="Nobody gets points. The imposter stays a secret."
          yes="End round"
          onNo={() => setLeaving(false)}
          onYes={() => act({ type: "lobby" })}
        />
      ) : (
        <div className="imp-foot">
          <button type="button" className="btn btn-quiet imp-small" onClick={() => setCheck("pick")}>
            Forgot your word?
          </button>
          <button type="button" className="btn btn-quiet imp-small" onClick={() => setLeaving(true)}>
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

function Countdown({ room, round }: { room: Room; round: Round }) {
  const timer = round.timer!;
  const now = useClock();
  const left = timeLeft(timer, now);
  const running = timer.endsAt !== null;
  const total = Math.max(room.options.timer * 1000, left, 1);
  const { sound } = room.options;

  // Time's up: buzz once, then park the timer at zero so a reload doesn't buzz again.
  useEffect(() => {
    if (!running || left > 0) return;
    if (sound) {
      vibrate([200, 100, 200, 100, 400]);
      playNotes([
        [880, 0, 0.18, 0.07],
        [880, 0.25, 0.18, 0.07],
        [1175, 0.5, 0.5, 0.07],
      ]);
    }
    act({ type: "timer", op: "pause", now: Date.now() });
  }, [running, left, sound]);

  const done = left === 0;
  return (
    <div className="imp-timer" data-state={done ? "done" : running ? "running" : "paused"}>
      <div className="imp-timer-time" role="timer" aria-label={done ? "Time's up" : "Time left"}>
        {done ? "Time's up" : formatDuration(Math.ceil(left / 1000) * 1000)}
      </div>
      <div className="imp-timer-bar" aria-hidden="true">
        <span style={{ transform: `scaleX(${left / total})` }} />
      </div>
      <div className="imp-row">
        {!done && (
          <button
            type="button"
            className="btn"
            onClick={() => act({ type: "timer", op: running ? "pause" : "resume", now: Date.now() })}
          >
            {running ? <PauseIcon width={16} height={16} /> : <PlayIcon width={16} height={16} />}
            {running ? "Pause" : "Resume"}
          </button>
        )}
        <button type="button" className="btn" onClick={() => act({ type: "timer", op: "add", now: Date.now() })}>
          <PlusIcon width={16} height={16} />
          30 sec
        </button>
      </div>
    </div>
  );
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
      <div className="imp-play">
        <div className="imp-screen">
          <p className="imp-kicker">Forgot your word?</p>
          <h2 className="imp-title">Who are you?</h2>
          <p className="imp-help">Everyone will see that you looked again.</p>
          <div className="imp-suspects">
            {round.seats.map((id) => (
              <button key={id} type="button" className="imp-suspect" onClick={() => onChange({ id })}>
                {names[id]}
              </button>
            ))}
          </div>
          <button type="button" className="btn btn-quiet" onClick={() => onChange(null)}>
            Never mind
          </button>
        </div>
      </div>
    );
  }
  const name = names[check.id];
  return (
    <div className="imp-play">
      <div className="imp-screen">
        <p className="imp-kicker">{name}&apos;s card</p>
        <HoldCard name={name} opens={round.opens[check.id] ?? 0} onOpen={() => act({ type: "open", id: check.id })}>
          <SecretFace round={round} id={check.id} clue={room.options.clue} />
        </HoldCard>
        <button type="button" className="btn btn-primary imp-big" onClick={() => onChange(null)}>
          Done
        </button>
      </div>
    </div>
  );
}
