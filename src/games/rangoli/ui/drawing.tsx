"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";

import { cryptoRandom } from "@/party/logic/random";
import { useClock } from "@/party/ui/use-clock";
import { Confirm } from "@/ui/confirm";
import { count, formatDuration } from "@/ui/format";
import { BulbIcon, CheckIcon, ClockIcon, GridIcon, PlayIcon, RestartIcon, StopIcon, UndoIcon } from "@/ui/icons";

import {
  elapsed,
  hintFor,
  nextSolveStep,
  patternOf,
  phaseOf,
  placeOf,
  solverOf,
  traceOf,
  wrongStart,
  type Action,
  type Game,
  type PatternRef,
} from "../logic/game";
import { findPattern, PACKS } from "../logic/packs";
import { bestFor } from "../logic/progress";
import { DoneCard, StuckCard } from "./cards";
import { Floor } from "./floor";
import { finishTune, lineSound, stuckSound } from "./sounds";
import { actPlay, recordFinished, useOptions, useProgress } from "./stores";

const SIZE_NAMES = { small: "Small", medium: "Medium", large: "Large" } as const;

/** What the drawing screen calls a pattern: its name and where it sits. */
export function describe(ref: PatternRef): { name: string; place: string; bestName: string } {
  if (ref.kind === "endless") {
    const size = SIZE_NAMES[ref.size];
    return { name: "Endless", place: `${size} · a new pattern`, bestName: size };
  }
  const found = findPattern(ref.id);
  const pack = PACKS.find((p) => p.id === found?.pack);
  const name = found?.entry.name ?? "Rangoli";
  return { name, place: pack && found ? `${pack.name} · ${found.index + 1} of ${pack.patterns.length}` : "", bestName: name };
}

/** The drawing screen: the floor, how far along it is, and the buttons (or a card when it ends). */
export function Drawing({ game }: { game: Game }) {
  const pattern = patternOf(game.ref)!;
  const solver = solverOf(pattern);
  const { sound } = useOptions();
  const progress = useProgress();
  const [solving, setSolving] = useState(false);
  const [confirmRestart, setConfirmRestart] = useState(false);
  // A finger went down on a dot other than the pen: say where to carry on, for a moment.
  const [missedAt, setMissedAt] = useState(0);

  const act = (action: Action) => actPlay({ type: "game", action });
  const phase = phaseOf(game, pattern);
  const total = pattern.lines.length;
  const drawnCount = game.lines.length;
  const wrong = wrongStart(game, pattern);
  const { name, place, bestName } = describe(game.ref);

  const now = useClock(game.startedAt !== null && game.finishedAt === null);
  const time = elapsed(game, now);
  const missed = missedAt > 0;
  useEffect(() => {
    if (!missedAt) return;
    const id = window.setTimeout(() => setMissedAt(0), 2200);
    return () => window.clearTimeout(id);
  }, [missedAt]);

  // Best times: runs Watch it solve helped don't count.
  const best = bestFor(progress, game.ref);
  useEffect(() => {
    if (phase !== "done" || game.assisted || game.startedAt === null || game.finishedAt === null) return;
    recordFinished({
      ref: game.ref,
      run: { ms: game.finishedAt - game.startedAt, hints: game.hints, undos: game.undos, runId: game.startedAt },
    });
  }, [phase, game]);
  const newBest = phase === "done" && !game.assisted && best?.runId === game.startedAt;

  // Watch it solve: a start dot, then a line at a time, stepping back out of dead ends first.
  const stepMs = Math.min(420, Math.max(140, Math.round(7000 / total)));
  const solveStep = useEffectEvent((now: number) => {
    const step = nextSolveStep(game, pattern);
    if (!step) setSolving(false);
    else if (step.type === "start") act({ type: "start", dot: step.dot });
    else if (step.type === "undo") act({ type: "undo", to: step.to });
    else act({ type: "trace", line: step.line, now, auto: true });
  });
  useEffect(() => {
    if (!solving) return;
    const id = window.setTimeout(() => solveStep(Date.now()), drawnCount === 0 ? 120 : stepMs);
    return () => window.clearTimeout(id);
  }, [solving, game, stepMs, drawnCount]);

  // A soft note per line, a tune at the end, a low note when stuck (all under Sound).
  // Watch it solve only sounds at the end.
  const lastCount = useRef(drawnCount);
  useEffect(() => {
    const before = lastCount.current;
    lastCount.current = drawnCount;
    if (!sound || drawnCount <= before) return;
    if (phase === "done") finishTune();
    else if (phase === "stuck") stuckSound();
    else if (!solving) lineSound(drawnCount, total);
  }, [drawnCount, phase, solving, sound, total]);

  function stopAnd(fn: () => void) {
    setSolving(false);
    setConfirmRestart(false);
    fn();
  }
  const undo = () => stopAnd(() => act({ type: "undo" }));
  const restart = () => stopAnd(() => act({ type: "restart" }));
  function askRestart() {
    if (drawnCount > 1 && phase !== "done") stopAnd(() => setConfirmRestart(true));
    else restart();
  }
  function hint() {
    if (solving || phase === "done" || phase === "stuck") return;
    setConfirmRestart(false);
    act({ type: "hint", hint: hintFor(game, pattern) });
  }

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.defaultPrevented || e.altKey) return;
    if ((e.target as HTMLElement | null)?.closest("input, textarea, select, [contenteditable]")) return;
    const key = e.key.toLowerCase();
    if (key === "escape" && confirmRestart) setConfirmRestart(false);
    else if ((e.metaKey || e.ctrlKey) && key === "z" && !e.shiftKey) {
      e.preventDefault();
      undo();
    } else if (!e.metaKey && !e.ctrlKey) {
      if (key === "u") undo();
      else if (key === "h") hint();
    }
  });
  useEffect(() => {
    const listener = (e: KeyboardEvent) => onKey(e);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  const hinted = game.hint;
  const glow = hinted?.kind === "start" ? hinted.dots : wrong ? solver.startDots() : [];
  const hintLine = hinted?.kind === "line" ? hinted.line : null;
  const finished = (phase === "done" || phase === "stuck") && !solving;

  const status =
    phase === "done" ? (
      <>
        <CheckIcon width={16} height={16} strokeWidth={3} />
        Drawn in one line
      </>
    ) : phase === "stuck" ? (
      <>
        Stuck at line <span className="rg-status-num">{drawnCount}</span> of {total}
      </>
    ) : missed ? (
      "Carry on from the pink dot"
    ) : drawnCount > 0 ? (
      <>
        Line <span className="rg-status-num">{drawnCount}</span> of {total}
      </>
    ) : wrong ? (
      "Start on a glowing dot"
    ) : game.start !== null ? (
      "Now draw a line from the pink dot"
    ) : (
      "Put your finger on any dot"
    );

  const next = nextOf(game.ref);
  const label = `${name}: ${phase === "done" ? "drawn in one line" : `${drawnCount} of ${total} lines drawn`}`;

  return (
    <div className="rg" data-panel={confirmRestart ? "confirm" : finished ? "result" : "controls"}>
      <div className="rg-intro">
        <div className="rg-intro-text">
          <span className="label rg-place">{place}</span>
          <h1 className="game-title">{name}</h1>
        </div>
        <button type="button" className="btn rg-patterns" onClick={() => stopAnd(() => actPlay({ type: "list" }))}>
          <GridIcon width={16} height={16} strokeWidth={2.4} />
          Patterns
        </button>
      </div>

      <div className="card rg-status">
        <div className="rg-status-row">
          <span className="rg-status-text" aria-live="polite">
            {status}
          </span>
          {game.startedAt !== null && (
            <span className="rg-time" aria-label={`Time ${formatDuration(time)}`}>
              <ClockIcon width={16} height={16} strokeWidth={2} />
              {formatDuration(time)}
            </span>
          )}
        </div>
        <div className="rg-progress" aria-hidden="true">
          <span style={{ width: `${(drawnCount / total) * 100}%` }} />
        </div>
      </div>

      <div className="rg-floor-area">
        <Floor
          pattern={pattern}
          trace={traceOf(game)}
          phase={phase}
          solving={solving}
          glow={glow}
          hintLine={hintLine}
          label={label}
          onStart={(dot) => act({ type: "start", dot })}
          onTrace={(line) => act({ type: "trace", line, now: Date.now() })}
          onMiss={() => setMissedAt(Date.now())}
        />
        {/* Under the floor, not above it: nothing above may change height while a finger is drawing. */}
        {wrong && (
          <p className="rg-note">
            An odd number of lines meet at each glowing dot, so the line has to start at one and end at the other.
          </p>
        )}
      </div>

      <div className="rg-actions">
        {confirmRestart ? (
          <Confirm
            title="Start over?"
            detail={`You're on line ${drawnCount} of ${total}. This drawing will be cleared.`}
            yes="Start over"
            no="Keep drawing"
            onYes={restart}
            onNo={() => setConfirmRestart(false)}
          />
        ) : finished && phase === "done" ? (
          <DoneCard
            title={game.ref.kind === "pack" ? `${name}, in one line` : "In one line"}
            undos={game.undos}
            hints={game.hints}
            assisted={game.assisted}
            newBest={newBest}
            next={next}
            onAgain={() => stopAnd(() => actPlay({ type: "again" }))}
          />
        ) : finished ? (
          <StuckCard
            drawn={drawnCount}
            backTo={solver.lastGood(traceOf(game))}
            onUndo={undo}
            onBack={() => stopAnd(() => act({ type: "undo", to: solver.lastGood(traceOf(game)) }))}
            onRestart={restart}
          />
        ) : (
          <div className="rg-controls">
            <div className="rg-tools">
              <button
                type="button"
                className={hinted?.kind === "back" ? "btn is-nudged" : "btn"}
                onClick={undo}
                disabled={game.start === null}
                title="Undo (U)"
              >
                <UndoIcon width={16} height={16} strokeWidth={2.6} /> Undo
              </button>
              <button type="button" className="btn" onClick={hint} disabled={solving} title="Hint (H)">
                <BulbIcon width={16} height={16} strokeWidth={2.6} /> Hint
              </button>
              <button type="button" className="btn rg-restart" onClick={askRestart} aria-label="Restart" title="Restart">
                <RestartIcon width={18} height={18} strokeWidth={2.6} />
                <span className="rg-restart-label">Restart</span>
              </button>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-big rg-solve"
              onClick={() => {
                setConfirmRestart(false);
                setSolving((s) => !s);
              }}
            >
              {solving ? <StopIcon width={16} height={16} /> : <PlayIcon width={16} height={16} />}
              {solving ? "Stop" : "Watch it solve"}
            </button>
          </div>
        )}
      </div>

      <p className="rg-best">
        <span className="rg-medal" aria-hidden="true" />
        {best ? (
          <span>
            Best on {bestName}: <span className="rg-best-time">{formatDuration(best.ms)}</span> ·{" "}
            {game.ref.kind === "endless"
              ? `${progress.endless[game.ref.size]?.drawn ?? 0} drawn`
              : best.hints === 0
                ? "no hints"
                : count(best.hints, "hint")}
          </span>
        ) : game.ref.kind === "endless" ? (
          <span>No {bestName.toLowerCase()} pattern drawn yet.</span>
        ) : (
          <span>{name} isn&apos;t drawn yet. Every pattern is open.</span>
        )}
      </p>
    </div>
  );
}

/** The main button on the done card: the next hand-made pattern, or another Endless one of the same size. */
function nextOf(ref: PatternRef): { label: string; onClick: () => void } | null {
  if (ref.kind === "endless") {
    return {
      label: "New pattern",
      onClick: () => actPlay({ type: "open", ref: { kind: "endless", size: ref.size, seed: Math.floor(cryptoRandom() * 2 ** 31) } }),
    };
  }
  const nextId = placeOf(ref.id)?.next;
  return nextId ? { label: "Next pattern", onClick: () => actPlay({ type: "open", ref: { kind: "pack", id: nextId } }) } : null;
}
