"use client";

import { useEffect, useState } from "react";

import { cryptoRandom } from "@/party/logic/random";
import { useClock } from "@/party/ui/use-clock";
import { CheckIcon } from "@/ui/icons";

import { isOut, reduce, RESULT_MS, roleOut, targets, type Action, type Game, type Night, type Room } from "../logic/game";
import { narration } from "../logic/narration";
import { ROLE_NAMES, type NightRole } from "../logic/roles";
import { useUnlocked } from "./narrator";
import { startNightSound, stopNightSound } from "./night-sound";
import { actAndSay, Foot, Head, namesOf, nightNotes } from "./parts";
import { act } from "./use-room";

/**
 * The night. The phone lies face up in the middle and calls each role in turn, saying
 * every line out loud and showing it in big type. Every role's screen starts clean: the
 * Doctor and the Police never see who the Mafia picked.
 */
export function NightScreen({ room, game }: { room: Room; game: Game }) {
  const night = game.night!;
  const unlocked = useUnlocked();
  if (night.step === "ready") return <Ready room={room} game={game} />;
  // After a reload the phone may not speak until someone taps, so the night waits for one.
  if (!unlocked) return <CarryOn room={room} game={game} />;
  return <Sky room={room} game={game} night={night} />;
}

/** One random number for both the preview and the real action, so they agree. */
function once(): () => number {
  const r = cryptoRandom();
  return () => r;
}

function startNight(room: Room): void {
  const action: Action = { type: "nightfall", now: Date.now() };
  if (room.options.sound) nightNotes();
  actAndSay(room, action, reduce(room, action));
}

/** Everyone has their card: the phone goes in the middle, then a tap starts the night. */
function Ready({ room, game }: { room: Room; game: Game }) {
  return (
    <div className="party-play">
      <Head chip={`Night ${game.round}`} label="Everyone's dealt" />
      <div className="party-stage maf-ready">
        <MoonMark />
        <h2 className="party-title">Everyone has a role</h2>
        <p className="party-help">
          Put the phone face up in the middle of the circle and turn the volume up. It calls each role in turn while
          everyone else keeps their eyes closed.
        </p>
        {!room.options.voice && (
          <p className="party-help">The narrator voice is off, so the lines only show on screen.</p>
        )}
        <button type="button" className="btn btn-primary btn-big maf-night-go" onClick={() => startNight(room)}>
          Start the night
        </button>
      </div>
      <Foot room={room} />
    </div>
  );
}

/** Back after a reload mid-night: one tap says the last line again, with a fresh wait. */
function CarryOn({ room, game }: { room: Room; game: Game }) {
  const carryOn = () => {
    const action: Action = { type: "resume", now: Date.now(), rng: once() };
    actAndSay(room, action, reduce(room, action));
  };
  return (
    <div className="party-play">
      <Head chip={`Night ${game.round}`} label="Paused" />
      <div className="maf-sky maf-sky-paused">
        <p className="maf-sky-line">The night was interrupted</p>
        <p className="maf-sky-note">
          Phone face up in the middle, everyone&apos;s eyes closed. Tap Carry on and the phone says the last line again.
        </p>
        <button type="button" className="btn btn-primary btn-big" onClick={carryOn}>
          Carry on
        </button>
      </div>
      {/* Say it again here would skip the fresh wait: Carry on says the line. */}
      <Foot room={room} sayAgain={false} />
    </div>
  );
}

const STEP_LABELS: Record<NightRole | "dusk", string> = {
  dusk: "Eyes closed",
  mafia: "Mafia",
  doctor: "Doctor",
  police: "Police",
};

function Sky({ room, game, night }: { room: Room; game: Game; night: Night }) {
  const now = useClock();
  const names = namesOf(room);
  const line = narration(room);

  // A quiet night under the narrator, with the Sound switch.
  const { sound } = room.options;
  useEffect(() => {
    if (!sound) return;
    startNightSound();
    return stopNightSound;
  }, [sound]);

  // The clock moves the night on: every turn ends on its own time, not on the tap.
  useEffect(() => {
    act({ type: "tick", now: Date.now(), rng: cryptoRandom });
  }, [now]);

  const step = night.step as NightRole | "dusk";
  let body = null;
  if (step !== "dusk" && night.phase === "open") {
    if (roleOut(game, step)) {
      body = (
        <p className="maf-sky-note">
          The {ROLE_NAMES[step]} is out, so nobody taps. The phone waits the same time anyway.
        </p>
      );
    } else if (night.doneAt === null) {
      // A new key per role and night: each screen starts clean.
      body = <Pick key={`${game.round}-${step}`} game={game} role={step} names={names} />;
    } else if (step === "police" && night.check && now < night.doneAt + RESULT_MS) {
      body = <Answer name={names[night.check]} mafia={game.roles[night.check] === "mafia"} />;
    } else {
      body = <p className="maf-sky-done">Done. Close your eyes.</p>;
    }
  }
  const answering = step === "police" && night.doneAt !== null && night.phase === "open" && now < night.doneAt + RESULT_MS;

  return (
    <div className="party-play">
      <Head chip={`Night ${game.round}`} label={STEP_LABELS[step]} />
      <section className="maf-sky" aria-live="polite" data-step={step}>
        {!answering && line && (
          <p className={line.lines[0].length > 56 ? "maf-sky-line is-long" : "maf-sky-line"}>{line.lines[0]}</p>
        )}
        {body}
      </section>
      <Foot room={room} />
    </div>
  );
}

const VERBS: Record<NightRole, string> = { mafia: "Pick", doctor: "Save", police: "Check" };

/** A role picks one name, then confirms it. */
function Pick({ game, role, names }: { game: Game; role: NightRole; names: Record<string, string> }) {
  const [picked, setPicked] = useState<string | null>(null);
  const people = targets(game, role);
  const blocked = role === "doctor" && game.lastSave && !isOut(game, game.lastSave) ? game.lastSave : null;
  return (
    <>
      <div className="party-picks maf-picks" role="group" aria-label={`${ROLE_NAMES[role]}: pick a name`}>
        {people.map((id) => {
          const on = picked === id;
          return (
            <button
              key={id}
              type="button"
              className="btn party-pick"
              aria-pressed={on}
              onClick={() => setPicked(on ? null : id)}
            >
              {on && <CheckIcon width={18} height={18} strokeWidth={3} />}
              <span>{names[id]}</span>
            </button>
          );
        })}
      </div>
      {blocked && <p className="maf-sky-note">{names[blocked]} was saved last night, so not again tonight.</p>}
      <button
        type="button"
        className="btn btn-primary btn-big maf-confirm"
        disabled={picked === null}
        onClick={() => picked && act({ type: "pick", id: picked, now: Date.now() })}
      >
        {picked ? `${VERBS[role]} ${names[picked]}` : "Tap a name"}
      </button>
    </>
  );
}

/** The Police's answer, in big type for three seconds, without a sound. */
function Answer({ name, mafia }: { name: string; mafia: boolean }) {
  return (
    <div className="maf-answer" role="status">
      <span className="maf-answer-name">{name} is</span>
      <span className="maf-answer-word">{mafia ? "Mafia" : "Not Mafia"}</span>
    </div>
  );
}

function MoonMark() {
  return (
    <svg className="maf-moon" viewBox="0 0 64 64" width="88" height="88" aria-hidden="true">
      <path d="M40 9a23 23 0 1 0 15 40A19 19 0 0 1 40 9Z" />
      <path d="M13 12l1.6 3.4L18 17l-3.4 1.6L13 22l-1.6-3.4L8 17l3.4-1.6Z" />
      <path d="M53 52l1.1 2.4 2.4 1.1-2.4 1.1L53 59l-1.1-2.4-2.4-1.1 2.4-1.1Z" />
    </svg>
  );
}
