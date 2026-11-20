"use client";

import { useEffect, useRef, useState } from "react";

import { PlayHead } from "@/party/ui/parts";
import { tick, wakeAudio } from "@/party/ui/sounds";
import { useClock } from "@/party/ui/use-clock";
import { Confirm } from "@/ui/confirm";
import { ArrowUpRightIcon, SpeakerIcon } from "@/ui/icons";
import { playNotes, vibrate } from "@/ui/sound";

import { KIND_TEXT, type AnswerKind } from "../logic/questions";
import type { QuestionRound, Room } from "../logic/room";
import { QuestionFace } from "./parts";
import { act } from "./use-room";

/** The answer kind's mark on the How to answer card. */
function KindMark({ kind }: { kind: AnswerKind }) {
  if (kind === "point") return <ArrowUpRightIcon width={24} height={24} strokeWidth={2.4} />;
  return <>{kind === "number" ? "#" : kind === "scale" ? "1–5" : "10"}</>;
}

/** Count us in: 1, 2 and 3 a second apart, then "Now!". */
const STEP_MS = 1000;
const COUNT = 3;

/**
 * Questions mode, after the deal: the phone goes down and everyone answers their own
 * question at once. Never shows either question.
 */
export function Answer({ room, round }: { room: Room; round: QuestionRound }) {
  const [leaving, setLeaving] = useState(false);
  const [countFrom, setCountFrom] = useState<number | null>(null);
  const now = useClock(countFrom !== null);
  const { sound } = room.options;
  const how = KIND_TEXT[round.question.kind];

  // 0 before counting, then 1, 2, 3, then 4 for "Now!".
  const step = countFrom === null ? 0 : Math.min(COUNT + 1, Math.floor(Math.max(0, now - countFrom) / STEP_MS) + 1);
  const said = useRef(0);
  useEffect(() => {
    if (step === 0 || step === said.current) return;
    said.current = step;
    if (!sound) return;
    if (step <= COUNT) tick();
    else {
      vibrate(60);
      playNotes([[1760, 0, 0.14, 0.06]]);
    }
  }, [step, sound]);
  const counting = step > 0 && step <= COUNT;

  return (
    <div className="party-play">
      <PlayHead round={round.number} label="Answer" />
      <div className="party-stage">
        <p className="imp-talk-kicker">Phone down. Everyone at once:</p>
        <h2 className="party-title is-big imp-answer-title">Answer on three</h2>

        <section className="card imp-answer-how" aria-labelledby="imp-answer-how">
          <span className="imp-answer-mark" aria-hidden="true">
            <KindMark kind={round.question.kind} />
          </span>
          <span className="imp-answer-text">
            <span className="label" id="imp-answer-how">
              How to answer
            </span>
            <span className="imp-answer-name">{how.how}</span>
            <span className="imp-answer-detail">{how.detail}</span>
          </span>
        </section>

        <ol className="imp-count" aria-hidden="true">
          {[1, 2, 3].map((n) => (
            <li key={n} data-on={step >= n || undefined}>
              {n}
            </li>
          ))}
        </ol>
        <p className="party-visually-hidden" role="status">
          {step === 0 ? "" : step <= COUNT ? String(step) : "Now!"}
        </p>
        <button
          type="button"
          className="btn imp-count-go"
          disabled={counting}
          onClick={() => {
            if (sound) wakeAudio();
            said.current = 0;
            setCountFrom(Date.now());
          }}
        >
          <SpeakerIcon width={16} height={16} strokeWidth={2.4} />
          {step > COUNT ? "Count again" : "Count us in"}
        </button>

        <p className="party-help">Remember who said what. Then show everyone the real question.</p>
        <button
          type="button"
          className="btn btn-primary btn-big imp-answer-go"
          onClick={() => act({ type: "show-question" })}
        >
          Show the question
        </button>
      </div>

      <EndRound leaving={leaving} onLeaving={setLeaving} />
    </div>
  );
}

/**
 * The crew's question, face up for the whole table. The card turns over once as the
 * screen opens; the odd question stays hidden until the result.
 */
export function Reveal({ room, round }: { room: Room; round: QuestionRound }) {
  const [leaving, setLeaving] = useState(false);
  const [landed, setLanded] = useState(false);
  const { crew, kind } = round.question;

  return (
    <div className="party-play">
      <PlayHead round={round.number} label="Reveal" />
      <div className="party-stage">
        <h2 className="imp-card-kicker">Everyone&apos;s question was</h2>
        <div
          className={landed ? "party-face imp-question-card" : "party-face imp-question-card is-turning"}
          role="group"
          aria-label="The real question"
          onAnimationEnd={() => setLanded(true)}
        >
          <QuestionFace kicker="The question" question={crew} note={KIND_TEXT[kind].note} />
        </div>
        <p className="party-help imp-reveal-help">One of you had a different question. Whose answer doesn&apos;t fit?</p>
        <button
          type="button"
          className="btn btn-primary btn-big imp-answer-go"
          onClick={() => {
            // This tap starts the timer, so it wakes the sound for the last ten seconds' ticks.
            if (room.options.sound) wakeAudio();
            act({ type: "start-talk", now: Date.now() });
          }}
        >
          Start talking
        </button>
      </div>

      <EndRound leaving={leaving} onLeaving={setLeaving} />
    </div>
  );
}

/** End round, asking first, alone in the foot. */
function EndRound({ leaving, onLeaving }: { leaving: boolean; onLeaving: (leaving: boolean) => void }) {
  return leaving ? (
    <Confirm
      title="End this round?"
      detail="Nobody gets points. The imposter stays a secret."
      yes="End round"
      onNo={() => onLeaving(false)}
      onYes={() => act({ type: "lobby" })}
    />
  ) : (
    <div className="party-foot">
      <button type="button" className="btn imp-solo" onClick={() => onLeaving(true)}>
        End round
      </button>
    </div>
  );
}
