"use client";

import { useEffect, useLayoutEffect, useReducer, useRef, type PointerEvent, type ReactNode } from "react";

import { cryptoRandom } from "@/party/logic/random";
import { tick, wakeAudio } from "@/party/ui/sounds";
import { useClock } from "@/party/ui/use-clock";
import { useHydrated } from "@/party/ui/use-hydrated";
import { InfoIcon } from "@/ui/icons";
import { playNotes, vibrate } from "@/ui/sound";

import {
  EMPTY,
  MIN_FINGERS,
  phase,
  placeOf,
  reduce,
  teamOf,
  type Finger,
  type Phase,
  type Result,
} from "../logic/fingers";
import { MAX_TEAMS, MIN_TEAMS, MODES, type Mode } from "../logic/pick";
import { setOptions, useOptions } from "./use-options";

import "@/party/ui/party.css";
import "./finger-picker.css";

const MODE_LABELS: Record<Mode, string> = { one: "Pick one", teams: "Teams", order: "Order" };
const TEAM_LETTERS = ["A", "B", "C", "D"];
/** The countdown ring's length (r = 61 in a 128 box). */
const RING = 2 * Math.PI * 61;

/**
 * Everyone puts a finger on the screen; once nobody moves for a moment it counts down and
 * picks one, makes teams or puts everyone in order. One screen: the touch area, and the
 * choices under it while no finger is down.
 */
export function FingerPicker() {
  const options = useOptions();
  const hydrated = useHydrated();
  const [table, dispatch] = useReducer(reduce, EMPTY);
  const waiting = table.fingers.length >= MIN_FINGERS && table.result === null;
  const now = useClock(waiting);
  const at = phase(table, now);
  const count = table.fingers.length;

  // "Make teams" on a setup opens the picker on Teams (?mode=teams).
  useEffect(() => {
    const mode = new URLSearchParams(window.location.search).get("mode");
    if (MODES.includes(mode as Mode)) setOptions({ mode: mode as Mode });
  }, []);

  // The clock decides when the count is up; the pick itself is made in the reducer.
  useEffect(() => {
    if (waiting) dispatch({ type: "tick", now, mode: options.mode, teams: options.teams, rng: cryptoRandom });
  }, [waiting, now, options.mode, options.teams]);

  // A tick (and a buzz on Android) on each second of the count, and a chime for the pick.
  const heard = useRef<string>("");
  const cue = at.kind === "counting" ? `count-${at.left}` : at.kind === "picked" ? "picked" : "";
  useEffect(() => {
    if (cue === heard.current) return;
    heard.current = cue;
    if (!options.sound || cue === "") return;
    if (cue === "picked") {
      vibrate([60, 40, 140]);
      playNotes([
        [880, 0, 0.12, 0.06],
        [1320, 0.1, 0.32, 0.06],
      ]);
    } else {
      vibrate(30);
      tick();
    }
  }, [cue, options.sound]);

  // A call or an app switch drops every touch: the fingers go, but a result stays on
  // screen. Turning the phone moves the area under the discs, so it starts clean. Only a
  // new width counts as turning; a browser bar sliding in or out changes just the height.
  useEffect(() => {
    const lost = () => dispatch({ type: "lost" });
    const hidden = () => document.visibilityState === "hidden" && lost();
    let width = window.innerWidth;
    const turned = () => {
      if (window.innerWidth === width) return;
      width = window.innerWidth;
      dispatch({ type: "reset" });
    };
    window.addEventListener("blur", lost);
    window.addEventListener("resize", turned);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      window.removeEventListener("blur", lost);
      window.removeEventListener("resize", turned);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, []);

  const spot = (e: PointerEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - box.left, y: e.clientY - box.top };
  };
  const lift = (e: PointerEvent<HTMLDivElement>) => {
    dispatch({ type: "up", id: e.pointerId, now: Date.now() });
    // A finger lifting counts as a tap, so iPhones let the sound start from here.
    if (options.sound) wakeAudio();
  };

  // Phones stop counting touches at a limit (iPhones at 5): say so once it's reached.
  const result = at.kind === "picked" ? at.result : null;
  const limit = hydrated ? navigator.maxTouchPoints : 0;
  const full = !result && limit >= MIN_FINGERS && count >= limit;
  const chosen = result?.mode === "one" ? table.fingers.find((f) => f.id === result.picked) : undefined;

  return (
    <div className="fp">
      <div className="party-play-head">
        <span className="party-round">Finger picker</span>
        <span className="party-play-label">
          {count === 0 ? "2+ fingers" : count === 1 ? "1 finger" : `${count} fingers`}
        </span>
      </div>

      <div
        className="fp-area"
        data-phase={at.kind}
        data-color={chosen?.color}
        role="application"
        aria-label="Touch area: everyone puts one finger here"
        onPointerDown={(e) => {
          if (e.pointerType === "mouse" && e.button !== 0) return;
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {
            // Without capture, a finger sliding off the area still lifts as usual.
          }
          dispatch({ type: "down", id: e.pointerId, ...spot(e), now: Date.now() });
        }}
        onPointerMove={(e) => dispatch({ type: "move", id: e.pointerId, ...spot(e) })}
        onPointerUp={lift}
        onPointerCancel={lift}
        onContextMenu={(e) => e.preventDefault()}
      >
        {chosen && <Fill finger={chosen} />}
        <Status at={at} count={count} mode={options.mode} teams={options.teams} result={result} />
        {table.fingers.map((finger) => (
          <Disc key={finger.id} finger={finger} at={at} result={result} />
        ))}
        {full && (
          <div className="fp-area-foot">
            <p className="card fp-limit" role="note">
              <InfoIcon width={20} height={20} strokeWidth={2.2} />
              <span>This phone counts {limit} fingers at once. Anyone else waits for the next go.</span>
            </p>
          </div>
        )}
      </div>

      {/* Everything under the area shares one spot, so the area keeps its size as the choices
          give way to the count and then to Go again. */}
      <div className="fp-foot">
        <div className="fp-choices" inert={count > 0} data-hidden={count > 0 || undefined}>
          <Choice label="Mode" className="fp-modes">
            {MODES.map((mode) => (
              <SegButton key={mode} on={options.mode === mode} onClick={() => setOptions({ mode })}>
                {MODE_LABELS[mode]}
              </SegButton>
            ))}
          </Choice>
          {options.mode === "teams" && (
            <Choice label="Teams" className="fp-team-count">
              {Array.from({ length: MAX_TEAMS - MIN_TEAMS + 1 }, (_, i) => MIN_TEAMS + i).map((n) => (
                <SegButton key={n} on={options.teams === n} onClick={() => setOptions({ teams: n })} num>
                  {n}
                </SegButton>
              ))}
            </Choice>
          )}
        </div>
        {result ? (
          // The result stays when fingers lift, so everyone can look; only this clears it.
          <div className="fp-done">
            <p className="fp-foot-note is-summary">{summary(result, count)}</p>
            <button type="button" className="btn btn-primary btn-big fp-go" onClick={() => dispatch({ type: "reset" })}>
              Go again
            </button>
          </div>
        ) : (
          count > 0 && <p className="fp-foot-note">A finger joins or lifts? The count starts again.</p>
        )}
      </div>
    </div>
  );
}

function summary(result: Result, count: number): string {
  if (result.mode === "one") return `Pick one · 1 of ${count}`;
  if (result.mode === "teams") return `Teams · ${result.teams.length} teams`;
  return `Order · ${count} fingers`;
}

/** The words at the top of the touch area: the prompt, the count, or what was decided. */
function Status({
  at,
  count,
  mode,
  teams,
  result,
}: {
  at: Phase;
  count: number;
  mode: Mode;
  teams: number;
  result: Result | null;
}) {
  if (count === 0) {
    const then =
      mode === "teams"
        ? `splits you into ${teams} teams`
        : mode === "order"
          ? "puts you in order"
          : "picks one of you";
    return (
      <div className="fp-prompt">
        <span className="fp-prompt-art" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
        <h1 className="fp-prompt-title">Everyone, one finger on the screen</h1>
        <p className="fp-prompt-help">Keep still. Three seconds later the phone {then}.</p>
      </div>
    );
  }
  if (result?.mode === "one") {
    return (
      <p className="fp-status fp-picked" role="status">
        Picked!
      </p>
    );
  }
  if (result?.mode === "teams") {
    return (
      <div className="fp-status fp-teams" role="status">
        {result.teams.map((members, team) => (
          <span key={team} className="fp-team" data-color={team}>
            <span className="fp-team-letter">{TEAM_LETTERS[team]}</span>
            {members.length} {members.length === 1 ? "player" : "players"}
          </span>
        ))}
      </div>
    );
  }
  if (result?.mode === "order") {
    return (
      <p className="fp-status fp-order-title" role="status">
        In this order
      </p>
    );
  }
  if (at.kind === "counting") {
    return (
      <p className="fp-status fp-count" role="status">
        <span className="fp-count-label">Keep still. Picking in</span>
        <span className="fp-count-number">{at.left}</span>
      </p>
    );
  }
  return (
    <p className="fp-status fp-count" role="status">
      <span className="fp-count-label">{count === 1 ? "One more finger…" : "Keep still…"}</span>
    </p>
  );
}

/** One finger's disc: its colour (or its team's), a soft pulse, the countdown ring, a badge. */
function Disc({ finger, at, result }: { finger: Finger; at: Phase; result: Result | null }) {
  const team = result ? teamOf(result, finger.id) : null;
  const place = result ? placeOf(result, finger.id) : null;
  const state =
    result?.mode === "one" ? (result.picked === finger.id ? "chosen" : "faded") : result ? "decided" : "live";
  return (
    <span
      className="fp-disc"
      data-color={team ?? finger.color}
      data-state={state}
      style={{ left: finger.x, top: finger.y }}
      aria-hidden="true"
    >
      <span className="fp-disc-body" />
      {at.kind === "counting" && (
        <svg className="fp-ring" viewBox="0 0 128 128">
          <circle cx="64" cy="64" r="61" style={{ strokeDasharray: RING, strokeDashoffset: RING * at.done }} />
        </svg>
      )}
      {team !== null && <span className="fp-badge">{TEAM_LETTERS[team]}</span>}
      {place !== null && <span className="fp-badge is-place">{place}</span>}
    </span>
  );
}

/**
 * Pick one: the chosen finger's colour grows from under it until it fills the area (150%
 * reaches the farthest corner from anywhere). It grows once, with the Web Animations API,
 * so a page Next shows again doesn't replay it; under reduced motion it's just there.
 */
function Fill({ finger }: { finger: Finger }) {
  const ref = useRef<HTMLSpanElement>(null);
  const at = `${finger.x}px ${finger.y}px`;
  useLayoutEffect(() => {
    const fill = ref.current;
    if (!fill || typeof fill.animate !== "function") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    fill.animate([{ clipPath: `circle(50px at ${at})` }, { clipPath: `circle(150% at ${at})` }], {
      duration: 550,
      easing: "cubic-bezier(0.3, 0.7, 0.4, 1)",
    });
  }, [at]);
  return (
    <span
      ref={ref}
      className="fp-fill"
      data-color={finger.color}
      style={{ clipPath: `circle(150% at ${at})` }}
      aria-hidden="true"
    />
  );
}

function Choice({ label, className, children }: { label: string; className: string; children: ReactNode }) {
  const id = `fp-${label.toLowerCase()}`;
  return (
    <div className={`fp-choice ${className}`}>
      <span className="field-label" id={id}>
        {label}
      </span>
      <div className="seg" role="radiogroup" aria-labelledby={id}>
        {children}
      </div>
    </div>
  );
}

function SegButton({
  on,
  num = false,
  onClick,
  children,
}: {
  on: boolean;
  num?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button type="button" role="radio" aria-checked={on} className={num ? "is-num" : undefined} onClick={onClick}>
      {children}
    </button>
  );
}
