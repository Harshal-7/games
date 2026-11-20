"use client";

import { useEffect, useEffectEvent, useMemo, useState } from "react";

import { useSettings } from "@/settings/store";
import { count, formatDuration } from "@/ui/format";
import { BulbIcon, PlayIcon, RestartIcon, StopIcon, UndoIcon } from "@/ui/icons";

import { nextSolveStep } from "../logic/autoplay";
import { isClosedTour, SIZES, type Size } from "../logic/board";
import { elapsed, HINT_GO_BACK, newGame, phaseOf, reduce, type Action } from "../logic/game";
import { analyseCached, lastFinishable, warnsdorffMove } from "../logic/solver";
import { Board } from "./board";
import { ResultPanel } from "./result-panel";
import { recordBest, useBestTimes } from "./use-best-times";
import { useNow } from "./use-clock";

import "./knights-tour.css";

const FIRST_SIZE: Size = 5;

export function KnightsTour() {
  const { knightsTour: options } = useSettings();
  const [game, setGame] = useState(() => newGame(FIRST_SIZE));
  const [solving, setSolving] = useState(false);
  const [closedPanel, setClosedPanel] = useState<string | null>(null);

  const { size, path } = game;
  const total = size * size;
  const phase = phaseOf(game);
  const closed = isClosedTour(path, size);
  const act = (action: Action) => setGame((g) => reduce(g, action));

  // When the knight is stuck: the last move the tour could still be finished from.
  const backTo = useMemo(() => (phase === "stuck" ? lastFinishable(path, size) : null), [phase, path, size]);

  // Clock.
  const now = useNow(game.startedAt !== null && game.finishedAt === null);
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
  useEffect(() => {
    if (!solving) return;
    const id = window.setTimeout(
      () => {
        const step = nextSolveStep(game);
        if (!step) setSolving(false);
        else if (step.type === "undo") setGame((g) => reduce(g, { type: "undo" }));
        else setGame((g) => reduce(g, { type: "play", square: step.square, now: Date.now(), auto: true }));
      },
      game.path.length === 0 ? 0 : stepMs,
    );
    return () => window.clearTimeout(id);
  }, [solving, game, stepMs]);

  function play(square: number) {
    act({ type: "play", square, now: Date.now() });
  }
  function undo() {
    setSolving(false);
    act({ type: "undo" });
  }
  function goBack() {
    setSolving(false);
    if (backTo !== null) act({ type: "undo", to: backTo });
  }
  function restart() {
    setSolving(false);
    act({ type: "restart" });
  }
  function resize(next: Size) {
    setSolving(false);
    act({ type: "resize", size: next });
  }
  function hint() {
    if (solving) return;
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
    if ((e.metaKey || e.ctrlKey) && key === "z" && !e.shiftKey) {
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

  const finished = phase === "won" || phase === "stuck";
  const panelKey = `${game.id}:${path.length}`;
  const showPanel = finished && !solving && closedPanel !== panelKey;
  const nextSize = SIZES.find((s) => s > size) ?? null;
  const canHint = !solving && (phase === "start" || phase === "playing");

  const status =
    phase === "start"
      ? "Tap any square to place the knight"
      : phase === "won"
        ? "Tour complete"
        : phase === "stuck"
          ? `Stuck at ${path.length} of ${total}`
          : `Move ${path.length} of ${total}`;

  return (
    <div className="kt">
      <div className="seg kt-sizes" role="radiogroup" aria-label="Board size">
        {SIZES.map((s) => (
          <button key={s} type="button" role="radio" aria-checked={s === size} onClick={() => resize(s)}>
            {s}×{s}
          </button>
        ))}
      </div>

      <div className="kt-play">
        <div className="kt-status">
          <span aria-live="polite">{status}</span>
          <span className="kt-time" aria-label={`Time ${formatDuration(time)}`}>
            {formatDuration(time)}
          </span>
        </div>

        <div className="kt-board-wrap">
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
          {showPanel && (
            <ResultPanel
              outcome={phase}
              game={game}
              time={time}
              closed={closed}
              newBest={newBest}
              backTo={backTo}
              onRestart={restart}
              onUndo={undo}
              onBack={goBack}
              nextSize={nextSize}
              onNextSize={nextSize ? () => resize(nextSize) : null}
              onClose={() => setClosedPanel(panelKey)}
            />
          )}
        </div>

        <div className="kt-controls">
          <button
            type="button"
            className={game.hint === HINT_GO_BACK ? "btn kt-text-only is-nudged" : "btn kt-text-only"}
            onClick={undo}
            disabled={path.length === 0}
          >
            <UndoIcon /> Undo
          </button>
          <button type="button" className="btn kt-text-only" onClick={hint} disabled={!canHint}>
            <BulbIcon /> Hint
          </button>
          <button
            type="button"
            className={solving ? "btn btn-primary" : "btn"}
            onClick={() => setSolving((s) => !s)}
            disabled={!solving && phase === "won"}
          >
            {solving ? <StopIcon /> : <PlayIcon />}
            {solving ? "Stop" : "Watch it solve"}
          </button>
          <button type="button" className="btn kt-restart" onClick={restart} aria-label="Restart" title="Restart">
            <RestartIcon />
          </button>
        </div>
      </div>

      <p className="kt-best">
        {record
          ? `Best on ${size}×${size}: ${formatDuration(record.ms)} · ${count(record.undos, "undo")} · ${count(record.hints, "hint")}`
          : `No best time on ${size}×${size} yet.`}
      </p>
    </div>
  );
}
