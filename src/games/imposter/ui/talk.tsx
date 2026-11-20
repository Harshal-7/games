"use client";

import { useEffect, useRef, useState } from "react";

import { ringFraction, tickDue, timeLeft, timerTone } from "@/party/logic/timer";
import { tick, timeUp, wakeAudio } from "@/party/ui/sounds";
import { useClock } from "@/party/ui/use-clock";
import { Confirm } from "@/ui/confirm";
import { formatDuration } from "@/ui/format";
import { EyeOffIcon, PauseIcon, PlayIcon, PlusIcon } from "@/ui/icons";

import { TALK_MS, type Room, type Round } from "../logic/room";
import { HoldCard } from "./hold-card";
import { BigName, listNames, namesOf, PlayHead, SecretFace } from "./parts";
import { act } from "./use-room";

type Check = null | "pick" | { id: string };

/** Talking: who starts, the timer, then on to the vote. Never shows the word, hint or imposters. */
export function Talk({ room, round }: { room: Room; round: Round }) {
  const [check, setCheck] = useState<Check>(null);
  const [leaving, setLeaving] = useState(false);
  const names = namesOf(room);
  const imposters = round.imposters.length;
  const starter = names[round.starter];

  if (check !== null) return <Recheck room={room} round={round} check={check} onChange={setCheck} />;

  return (
    <div className="imp-play">
      <PlayHead round={round.number} label={imposters === 1 ? "1 imposter" : `${imposters} imposters`} />
      <div className="imp-stage">
        <p className="imp-talk-kicker">Put the phone down. First up:</p>
        <div className="imp-first">
          <BigName name={starter} />
          <span className="imp-first-chip" aria-hidden="true">
            1st
          </span>
        </div>
        <p className="imp-help imp-talk-help">
          Then go round the circle. Everyone says one word about the secret word. Too obvious and the imposter
          catches on; too vague and you look like the imposter.
        </p>
        {round.timer && <Countdown room={room} round={round} />}
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
        <div className="imp-foot">
          <button type="button" className="btn" onClick={() => setCheck("pick")}>
            Forgot your word?
          </button>
          <button type="button" className="btn" onClick={() => setLeaving(true)}>
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

/** The ring: radius 86 in a 200 box, drawn from the top, clockwise. */
const R = 86;
const LOOP = 2 * Math.PI * R;

/** "2 minutes 41 seconds", "24 seconds", "3 minutes". */
function spoken(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const parts = [];
  if (m > 0) parts.push(`${m} ${m === 1 ? "minute" : "minutes"}`);
  if (s > 0 || m === 0) parts.push(`${s} ${s === 1 ? "second" : "seconds"}`);
  return parts.join(" ");
}

/**
 * Talking time as a ring on the table: the page's text colour, then red with an edge
 * of it for the last 30 seconds, a soft tick for each of the last 10 and a buzz at 0.
 */
function Countdown({ room, round }: { room: Room; round: Round }) {
  const timer = round.timer!;
  const now = useClock();
  const left = timeLeft(timer, now);
  const running = timer.endsAt !== null;
  const total = TALK_MS;
  const { sound } = room.options;
  const done = left === 0;

  // Time's up: buzz once, then park the timer at zero so a reload doesn't buzz again.
  useEffect(() => {
    if (!running || left > 0) return;
    if (sound) timeUp();
    act({ type: "timer", op: "pause", now: Date.now() });
  }, [running, left, sound]);

  // The last 10 seconds tick, once per second as the shown time drops.
  const last = useRef(left);
  useEffect(() => {
    const prev = last.current;
    last.current = left;
    if (sound && tickDue(prev, left)) tick();
  }, [left, sound]);

  const seconds = Math.ceil(left / 1000);
  const of = left <= total ? ` of ${formatDuration(total)}` : "";
  const state = done ? "done" : running ? "running" : "paused";
  const arc = ringFraction(left, total) * LOOP;
  const label = done
    ? "Time's up"
    : `Time left${running ? "" : ", paused"}: ${spoken(seconds)}${left <= total ? ` of ${spoken(total / 1000)}` : ""}`;

  const change = (op: "pause" | "resume" | "add") => {
    if (sound) wakeAudio();
    act({ type: "timer", op, now: Date.now() });
  };

  return (
    <>
      <div className="imp-ring" data-tone={timerTone(left)} data-state={state} role="timer" aria-label={label}>
        <svg viewBox="0 0 200 200" aria-hidden="true">
          <circle className="imp-ring-track" cx="100" cy="100" r={R} />
          {arc > 0 && (
            <>
              <circle className="imp-ring-edge" cx="100" cy="100" r={R} strokeDasharray={`${arc} ${LOOP}`} />
              <circle className="imp-ring-arc" cx="100" cy="100" r={R} strokeDasharray={`${arc} ${LOOP}`} />
            </>
          )}
        </svg>
        <div className="imp-ring-dial">
          <span className="imp-ring-time">{formatDuration(seconds * 1000)}</span>
          <span className="imp-ring-label">{done ? "Time's up" : running ? `left${of}` : "Paused"}</span>
        </div>
      </div>
      <div className="imp-timer-buttons">
        {!done && (
          <button type="button" className="btn" onClick={() => change(running ? "pause" : "resume")}>
            {running ? <PauseIcon width={16} height={16} /> : <PlayIcon width={16} height={16} />}
            {running ? "Pause" : "Resume"}
          </button>
        )}
        <button type="button" className="btn" aria-label="Add 30 seconds" onClick={() => change("add")}>
          <PlusIcon width={16} height={16} strokeWidth={2.6} />
          30 sec
        </button>
      </div>
    </>
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
        <PlayHead round={round.number} label="Forgot your word?" />
        <div className="imp-stage">
          <EyeOffIcon className="imp-forgot-mark" width={44} height={44} strokeWidth={1.6} />
          <h2 className="imp-title is-big">Who are you?</h2>
          <p className="imp-help">Everyone will see that you looked again.</p>
          <div className="imp-picks" role="group" aria-label="Pick your name">
            {round.seats.map((id) => (
              <button key={id} type="button" className="btn imp-pick" onClick={() => onChange({ id })}>
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
    <div className="imp-play">
      <PlayHead round={round.number} label="Forgot your word?" />
      <div className="imp-stage">
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
