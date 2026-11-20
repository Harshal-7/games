"use client";

import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";

import { useClock } from "@/party/ui/use-clock";
import { updateSettings, useSettings } from "@/settings/store";
import { Confirm } from "@/ui/confirm";
import { count, formatDuration } from "@/ui/format";
import { BulbIcon, CheckIcon, ClockIcon, PlayIcon, RestartIcon, StopIcon, UndoIcon } from "@/ui/icons";
import { useLeaveGuard } from "@/ui/leave-guard";

import { nextSolveStep } from "../logic/autoplay";
import { isClosedTour, SIZES, type Size } from "../logic/board";
import { elapsed, HINT_GO_BACK, newGame, phaseOf, reduce, type Action, type Game } from "../logic/game";
import { analyseCached, lastFinishable, warnsdorffMove } from "../logic/solver";
import { Board } from "./board";
import { cue } from "./feedback";
import { ResultCard } from "./result-card";
import { recordBest, useBestTimes } from "./use-best-times";

import "../board-styles.css";
import "./knights-tour.css";

const FIRST_SIZE: Size = 5;

/** A board nobody has played on yet switches to `size`; one in play stays as it is. */
function withSize(game: Game, size: Size): Game {
  return game.path.length === 0 && game.size !== size ? newGame(size, game.id) : game;
}

/** Asked before throwing away a tour in progress. */
type Pending = { kind: "restart" } | { kind: "resize"; size: Size };

export function KnightsTour() {
  const { knightsTour: options } = useSettings();
  const [stored, setGame] = useState(() => newGame(FIRST_SIZE));
  const [solving, setSolving] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);

  // An untouched board takes the size picked last time (remembered in Settings).
  const savedSize = options.size;
  const game = useMemo(() => withSize(stored, savedSize), [stored, savedSize]);

  const { size, path } = game;
  const total = size * size;
  const phase = phaseOf(game);
  const closed = isClosedTour(path, size);
  const act = (action: Action) => setGame((g) => reduce(withSize(g, savedSize), action));

  // When the knight is stuck: the last move the tour could still be finished from.
  const backTo = useMemo(() => (phase === "stuck" ? lastFinishable(path, size) : null), [phase, path, size]);

  // Clock.
  const now = useClock(game.startedAt !== null && game.finishedAt === null);
  const time = elapsed(game, now);

  // Best times (this browser only). Runs finished by Watch it solve don't count.
  const best = useBestTimes();
  const record = best[size];
  useEffect(() => {
    if (phase !== "won" || game.assisted || game.startedAt === null || game.finishedAt === null) return;
    recordBest(game.size, {
      ms: game.finishedAt - game.startedAt,
      undos: game.undos,
      hints: game.hints,
      runId: game.startedAt,
    });
  }, [phase, game]);
  const newBest = phase === "won" && !game.assisted && record?.runId === game.startedAt && record.ms === time;

  // Watch it solve: one step per tick, stepping back out of dead ends first.
  const stepMs = Math.min(170, Math.max(70, Math.round(4000 / total)));
  const solveStep = useEffectEvent(() => {
    const step = nextSolveStep(game);
    if (!step) setSolving(false);
    else if (step.type === "undo") act({ type: "undo" });
    else act({ type: "play", square: step.square, now: Date.now(), auto: true });
  });
  useEffect(() => {
    if (!solving) return;
    const id = window.setTimeout(() => solveStep(), game.path.length === 0 ? 0 : stepMs);
    return () => window.clearTimeout(id);
  }, [solving, game, stepMs]);

  // Sound and vibration (Settings → Feedback): a click per jump, a chime or a low
  // note when the tour ends. Watch it solve only sounds at the end.
  const lastLength = useRef(path.length);
  useEffect(() => {
    const before = lastLength.current;
    lastLength.current = path.length;
    if (path.length <= before || (!options.sound && !options.vibrate)) return;
    const kind = phase === "won" ? "win" : phase === "stuck" ? "stuck" : "move";
    if (kind === "move" && solving) return;
    cue(kind, options);
  }, [path.length, phase, solving, options]);

  function play(square: number) {
    setPending(null);
    act({ type: "play", square, now: Date.now() });
  }
  function undo() {
    setSolving(false);
    setPending(null);
    act({ type: "undo" });
  }
  function goBack() {
    setSolving(false);
    setPending(null);
    if (backTo !== null) act({ type: "undo", to: backTo });
  }
  function restart() {
    setSolving(false);
    setPending(null);
    act({ type: "restart" });
  }
  function resize(next: Size) {
    setSolving(false);
    setPending(null);
    updateSettings((s) => ({ ...s, knightsTour: { ...s.knightsTour, size: next } }));
    act({ type: "resize", size: next });
  }

  // A tour with real progress isn't thrown away without asking first.
  const inProgress = path.length > 1 && phase !== "won";
  function askRestart() {
    if (!inProgress) return restart();
    setSolving(false);
    setPending({ kind: "restart" });
  }
  function askResize(next: Size) {
    if (next === size) return;
    if (!inProgress) return resize(next);
    setSolving(false);
    setPending({ kind: "resize", size: next });
  }

  // Leaving through "‹ Games" clears the board; a tour under way asks first.
  useLeaveGuard("knights-tour", {
    ask: inProgress,
    detail: "Your tour so far will be cleared.",
    end: restart,
  });

  function hint() {
    if (solving) return;
    setPending(null);
    // Before the knight is placed: a corner always works.
    if (phase === "start") return act({ type: "hint", square: 0 });
    if (phase !== "playing") return;
    const here = analyseCached(path, size);
    // In a dead end the honest hint is "go back": it makes the Undo button pulse.
    const square =
      here.status === "solvable"
        ? here.completion[0]
        : here.status === "unknown"
          ? (warnsdorffMove(path, size) ?? HINT_GO_BACK)
          : HINT_GO_BACK;
    act({ type: "hint", square });
  }

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.defaultPrevented || e.altKey) return;
    if ((e.target as HTMLElement | null)?.closest("input, textarea, select, [contenteditable]")) return;
    const key = e.key.toLowerCase();
    if (key === "escape" && pending) {
      setPending(null);
    } else if ((e.metaKey || e.ctrlKey) && key === "z" && !e.shiftKey) {
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

  const finished = (phase === "won" || phase === "stuck") && !solving;
  const nextSize = SIZES.find((s) => s > size) ?? null;
  const canHint = !solving && (phase === "start" || phase === "playing");

  // "Move 12 of 25", with the move number set apart.
  const status =
    phase === "start" ? (
      "Tap any square to place the knight"
    ) : phase === "won" ? (
      <>
        <CheckIcon width={16} height={16} strokeWidth={3} />
        Tour complete
      </>
    ) : (
      <>
        {phase === "stuck" ? "Stuck at" : "Move"} <span className="kt-status-num">{path.length}</span> of {total}
      </>
    );

  return (
    // data-panel: what sits under the board, so short windows can make room for a card.
    <div className="kt" data-panel={pending ? "confirm" : finished ? "result" : "controls"}>
      <div className="kt-intro">
        <h1 className="game-title">Knight&apos;s Tour</h1>
        <p className="game-blurb">Jump like a chess knight and land on every square exactly once.</p>
      </div>

      <div className="seg kt-sizes" role="radiogroup" aria-label="Board size">
        {SIZES.map((s) => (
          <button key={s} type="button" role="radio" aria-checked={s === size} onClick={() => askResize(s)}>
            {s}×{s}
          </button>
        ))}
      </div>

      <div className="card kt-status">
        <div className="kt-status-row">
          <span className="kt-status-text" aria-live="polite">
            {status}
          </span>
          {/* The clock starts with the first jump; before it the instructions need the room. */}
          {phase !== "start" && (
            <span className="kt-time" aria-label={`Time ${formatDuration(time)}`}>
              <ClockIcon width={16} height={16} strokeWidth={2} />
              {formatDuration(time)}
            </span>
          )}
        </div>
        <div className="kt-progress" aria-hidden="true">
          <span style={{ width: `${(path.length / total) * 100}%` }} />
        </div>
      </div>

      <div className="kt-board-area">
        <Board
          size={size}
          path={path}
          phase={phase}
          hint={game.hint}
          locked={solving}
          moveMs={solving ? Math.round(stepMs * 0.8) : 180}
          onSquare={play}
          options={options}
        />
      </div>

      <div className="kt-actions">
        {pending ? (
          <Confirm
            title={pending.kind === "restart" ? "Start over?" : `Switch to ${pending.size}×${pending.size}?`}
            detail={`You're on move ${path.length} of ${total}. This tour will be lost.`}
            yes={pending.kind === "restart" ? "Start over" : `Start ${pending.size}×${pending.size}`}
            no="Keep playing"
            onYes={() => (pending.kind === "restart" ? restart() : resize(pending.size))}
            onNo={() => setPending(null)}
          />
        ) : finished ? (
          <ResultCard
            outcome={phase}
            game={game}
            closed={closed}
            newBest={newBest}
            backTo={backTo}
            nextSize={nextSize}
            onRestart={restart}
            onUndo={undo}
            onBack={goBack}
            onNextSize={() => nextSize && resize(nextSize)}
          />
        ) : (
          <div className="kt-controls">
            <div className="kt-tools">
              <button
                type="button"
                className={game.hint === HINT_GO_BACK ? "btn is-nudged" : "btn"}
                onClick={undo}
                disabled={path.length === 0}
                title="Undo (U)"
              >
                <UndoIcon width={16} height={16} strokeWidth={2.6} /> Undo
              </button>
              <button type="button" className="btn" onClick={hint} disabled={!canHint} title="Hint (H)">
                <BulbIcon width={16} height={16} strokeWidth={2.6} /> Hint
              </button>
              <button type="button" className="btn kt-restart" onClick={askRestart} aria-label="Restart" title="Restart">
                <RestartIcon width={18} height={18} strokeWidth={2.6} />
                <span className="kt-restart-label">Restart</span>
              </button>
            </div>
            <button type="button" className="btn btn-primary btn-big kt-solve" onClick={() => setSolving((s) => !s)}>
              {solving ? <StopIcon width={16} height={16} /> : <PlayIcon width={16} height={16} />}
              {solving ? "Stop" : "Watch it solve"}
            </button>
          </div>
        )}
      </div>

      <p className="kt-best">
        {record ? (
          <>
            <span className="kt-medal" aria-hidden="true" />
            <span>
              Best on {size}×{size}: <span className="kt-best-time">{formatDuration(record.ms)}</span> ·{" "}
              {count(record.undos, "undo")} · {count(record.hints, "hint")}
            </span>
          </>
        ) : (
          `No best time on ${size}×${size} yet.`
        )}
      </p>
    </div>
  );
}
