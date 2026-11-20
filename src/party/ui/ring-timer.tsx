"use client";

import { useEffect, useEffectEvent, useRef } from "react";

import { ringFraction, tickDue, timeLeft, timerTone, type Timer, type TimerOp } from "@/party/logic/timer";
import { formatDuration } from "@/ui/format";
import { PauseIcon, PlayIcon, PlusIcon } from "@/ui/icons";

import { tick, timeUp, wakeAudio } from "./sounds";
import { useClock } from "./use-clock";

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
 * A timer as a ring on the table: the page's text colour, then the game's colour with an
 * edge of the page's for the last 30 seconds, a soft tick for each of the last 10 and a
 * buzz at 0, with Pause and +30 sec under it. The game keeps the timer (logic/timer.ts)
 * and applies what `onTimer` asks for; at zero the ring asks to pause it, so a reload
 * doesn't buzz again.
 */
export function RingTimer({
  timer,
  total,
  sound,
  onTimer,
}: {
  timer: Timer;
  /** The full time in ms, for the ring and "of 3:00". */
  total: number;
  /** The game's Sound switch: the ticks and the time's-up buzz. */
  sound: boolean;
  onTimer: (op: TimerOp, now: number) => void;
}) {
  const now = useClock();
  const left = timeLeft(timer, now);
  const running = timer.endsAt !== null;
  const done = left === 0;

  // Time's up: buzz once, then park the timer at zero so a reload doesn't buzz again.
  const timesUp = useEffectEvent(() => {
    if (sound) timeUp();
    onTimer("pause", Date.now());
  });
  useEffect(() => {
    if (!running || left > 0) return;
    timesUp();
  }, [running, left]);

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

  const change = (op: TimerOp) => {
    if (sound) wakeAudio();
    onTimer(op, Date.now());
  };

  return (
    <>
      <div className="party-ring" data-tone={timerTone(left)} data-state={state} role="timer" aria-label={label}>
        <svg viewBox="0 0 200 200" aria-hidden="true">
          <circle className="party-ring-track" cx="100" cy="100" r={R} />
          {arc > 0 && (
            <>
              <circle className="party-ring-edge" cx="100" cy="100" r={R} strokeDasharray={`${arc} ${LOOP}`} />
              <circle className="party-ring-arc" cx="100" cy="100" r={R} strokeDasharray={`${arc} ${LOOP}`} />
            </>
          )}
        </svg>
        <div className="party-ring-dial">
          <span className="party-ring-time">{formatDuration(seconds * 1000)}</span>
          <span className="party-ring-label">{done ? "Time's up" : running ? `left${of}` : "Paused"}</span>
        </div>
      </div>
      <div className="party-timer-buttons">
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
