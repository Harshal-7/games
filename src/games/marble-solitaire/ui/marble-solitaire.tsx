"use client";

import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";

import { useClock } from "@/party/ui/use-clock";
import { Confirm } from "@/ui/confirm";
import { formatDuration } from "@/ui/format";
import { BulbIcon, CheckIcon, ClockIcon, PlayIcon, RestartIcon, StopIcon, UndoIcon } from "@/ui/icons";
import { useLeaveGuard } from "@/ui/leave-guard";

import { hintFor, nextSolveStep } from "../logic/analysis";
import { BOARD_IDS, BOARDS, type BoardId } from "../logic/boards";
import { elapsed, marbleCount, marblesOf, phaseOf, resultOf, type Hint, type Move } from "../logic/game";
import { Board } from "./board";
import { BoardShape } from "./board-shape";
import { bestText } from "./best-text";
import { OutOfReach, ResultCard } from "./result-card";
import { chime, clack, thud } from "./sounds";
import { act, recordBest, useBest, useGame, useOptions } from "./stores";
import { useAnalysis } from "./use-analysis";

import "@/games/knights-tour/board-styles.css";
import "./marble-solitaire.css";

/** Short names for the board picker; the full name is in the best line and the cards. */
const SHORT_NAMES: Record<BoardId, string> = { triangle: "Triangle", english: "English", european: "European" };

/** How long a hop takes, and Watch it solve's pace. */
const HOP_MS = 300;
const SOLVE_MS = 460;

/** Asked before throwing away a game in progress. */
type Pending = { kind: "restart" } | { kind: "switch"; board: BoardId };

export function MarbleSolitaire() {
  const game = useGame();
  const { sound } = useOptions();
  const [solving, setSolving] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  // The lifted marble belongs to one position: any jump or undo drops it.
  const [pick, setPick] = useState<{ moves: readonly Move[]; hole: number } | null>(null);

  const board = BOARDS[game.board];
  const marbles = useMemo(() => marblesOf(game), [game]);
  const phase = phaseOf(game);
  const left = marbleCount(marbles);
  const picked = pick && pick.moves === game.moves ? pick.hole : null;
  const result = phase === "over" ? resultOf(board, marbles) : null;

  // What the solver knows about this position, worked out in slices between taps.
  const info = useAnalysis(game.board, game.moves, !solving && phase !== "start");
  const outOfReach = phase === "playing" && info.analysis.status === "impossible";

  // Clock.
  const now = useClock(game.startedAt !== null && game.finishedAt === null);
  const time = elapsed(game, now);

  // Best results (this browser only). Games finished by Watch it solve don't count.
  const best = useBest();
  const record = best[game.board];
  useEffect(() => {
    if (!result || game.assisted || game.startedAt === null || game.finishedAt === null) return;
    recordBest(game.board, {
      left: result.left,
      perfect: result.kind === "perfect",
      ms: game.finishedAt - game.startedAt,
      hints: game.hints,
      runId: game.startedAt,
    });
  }, [result, game]);
  const newBest = result !== null && !game.assisted && record?.runId === game.startedAt;

  // Watch it solve: one step per tick, stepping back out of dead ends first.
  const solveRound = useRef(0);
  const solveStep = useEffectEvent(() => {
    const step = nextSolveStep(game.board, game.moves, solveRound.current++);
    if (!step) setSolving(false);
    else if (step.type === "undo") act({ type: "undo" });
    else act({ type: "jump", from: step.move.from, to: step.move.to, now: Date.now(), auto: true });
  });
  useEffect(() => {
    if (!solving) return;
    const id = window.setTimeout(() => solveStep(), SOLVE_MS);
    return () => window.clearTimeout(id);
  }, [solving, game]);

  // Sound (Settings → Sound): a clack per jump, a chime or two low notes at the end.
  // Watch it solve only sounds at the end.
  const lastLength = useRef(game.moves.length);
  useEffect(() => {
    const before = lastLength.current;
    lastLength.current = game.moves.length;
    if (game.moves.length <= before || !sound) return;
    if (result) {
      if (result.left === 1) chime(result.kind === "perfect");
      else thud();
    } else if (!solving) {
      clack();
    }
  }, [game.moves.length, result, solving, sound]);

  function jump(from: number, to: number) {
    setPending(null);
    setPick(null);
    act({ type: "jump", from, to, now: Date.now() });
  }
  function choose(hole: number | null) {
    setPending(null);
    setPick(hole === null ? null : { moves: game.moves, hole });
  }
  function stop() {
    setSolving(false);
    setPending(null);
    setPick(null);
  }
  function undo() {
    stop();
    act({ type: "undo" });
  }
  function goBack(to: number) {
    stop();
    act({ type: "undo", to });
  }
  function restart() {
    stop();
    act({ type: "restart" });
  }
  function switchBoard(next: BoardId) {
    stop();
    act({ type: "switch", board: next });
  }

  // A game with real progress isn't thrown away without asking first.
  const inProgress = game.moves.length > 1 && phase !== "over";
  function askRestart() {
    if (!inProgress) return restart();
    setSolving(false);
    setPending({ kind: "restart" });
  }
  function askSwitch(next: BoardId) {
    if (next === game.board) return;
    if (!inProgress) return switchBoard(next);
    setSolving(false);
    setPending({ kind: "switch", board: next });
  }

  // Leaving through "‹ Games" clears the board; a game under way asks first.
  useLeaveGuard("marble-solitaire", {
    ask: inProgress,
    detail: "Your game so far will be cleared.",
    end: restart,
  });

  function hint() {
    if (solving || phase === "over") return;
    setPending(null);
    setPick(null);
    const { analysis } = info;
    // Known answers first; otherwise a search now (Hint falls back to any legal jump).
    const next: Hint | null =
      analysis.status === "solvable" && analysis.completion.length > 0
        ? { from: analysis.completion[0].from, to: analysis.completion[0].to }
        : analysis.status === "impossible"
          ? "back"
          : hintFor(game.board, game.moves);
    if (next) act({ type: "hint", hint: next });
  }

  function toggleSolve() {
    setPending(null);
    setPick(null);
    setSolving((s) => !s);
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

  const finished = result !== null && !solving;
  const jumpsToWin = board.holes.length - 2;
  const nextBoard = BOARD_IDS[BOARD_IDS.indexOf(game.board) + 1] ?? null;
  const showBack = (k: number | null): k is number => k !== null && k > 0 && k < game.moves.length - 1;

  const status =
    phase === "start" ? (
      "Tap a marble to start"
    ) : result && result.left === 1 ? (
      <>
        <CheckIcon width={16} height={16} strokeWidth={3} />
        {result.title}
      </>
    ) : result ? (
      "No jumps left"
    ) : (
      <>
        <span className="ms-status-num">{left}</span> marbles left
      </>
    );

  return (
    // data-panel: what sits under the board, so short windows can make room for a card.
    <div className="ms" data-panel={pending ? "confirm" : finished ? "result" : outOfReach ? "stuck" : "controls"}>
      <div className="ms-intro">
        <h1 className="game-title">Marble solitaire</h1>
        <p className="game-blurb">Jump a marble over its neighbour to take it off. Leave just one.</p>
      </div>

      <div className="seg ms-boards" role="radiogroup" aria-label="Board">
        {BOARD_IDS.map((id) => (
          <button key={id} type="button" role="radio" aria-checked={id === game.board} onClick={() => askSwitch(id)}>
            <BoardShape board={id} />
            {SHORT_NAMES[id]}
          </button>
        ))}
      </div>

      <div className="card ms-status">
        <div className="ms-status-row">
          <span className="ms-status-text" aria-live="polite">
            {status}
          </span>
          {/* The clock starts with the first jump; before it the instructions need the room. */}
          {phase !== "start" && (
            <span className="ms-time" aria-label={`Time ${formatDuration(time)}`}>
              <ClockIcon width={16} height={16} strokeWidth={2} />
              {formatDuration(time)}
            </span>
          )}
        </div>
        <div className="ms-progress" aria-hidden="true">
          <span style={{ width: `${(game.moves.length / jumpsToWin) * 100}%` }} />
        </div>
      </div>

      <div className="ms-board-area">
        <Board
          boardId={game.board}
          marbles={marbles}
          moves={game.moves}
          picked={picked}
          hint={game.hint}
          locked={solving || phase === "over"}
          hopMs={solving ? Math.round(SOLVE_MS * 0.7) : HOP_MS}
          onPick={choose}
          onJump={jump}
        />
      </div>

      <div className="ms-actions">
        {pending ? (
          <Confirm
            title={pending.kind === "restart" ? "Start over?" : `Switch to ${BOARDS[pending.board].name}?`}
            detail={`${left} marbles left on this board. This game will be lost.`}
            yes={pending.kind === "restart" ? "Start over" : `Play ${BOARDS[pending.board].name}`}
            no="Keep playing"
            onYes={() => (pending.kind === "restart" ? restart() : switchBoard(pending.board))}
            onNo={() => setPending(null)}
          />
        ) : finished ? (
          <ResultCard
            result={result}
            board={board}
            game={game}
            time={time}
            newBest={newBest}
            back={showBack(info.back) ? info.back : null}
            nextBoard={nextBoard}
            onRestart={restart}
            onUndo={undo}
            onBack={goBack}
            onNext={() => nextBoard && switchBoard(nextBoard)}
          />
        ) : (
          <div className="ms-controls">
            {outOfReach && !solving ? (
              <OutOfReach
                back={showBack(info.back) ? info.back : null}
                onUndo={undo}
                onBack={goBack}
                onRestart={askRestart}
              />
            ) : (
              <div className="ms-tools">
                <button
                  type="button"
                  className={game.hint === "back" ? "btn is-nudged" : "btn"}
                  onClick={undo}
                  disabled={game.moves.length === 0}
                  title="Undo (U)"
                >
                  <UndoIcon width={16} height={16} strokeWidth={2.6} /> Undo
                </button>
                <button type="button" className="btn" onClick={hint} disabled={solving || phase === "over"} title="Hint (H)">
                  <BulbIcon width={16} height={16} strokeWidth={2.6} /> Hint
                </button>
                <button type="button" className="btn ms-restart" onClick={askRestart} aria-label="Restart" title="Restart">
                  <RestartIcon width={18} height={18} strokeWidth={2.6} />
                  <span className="ms-restart-label">Restart</span>
                </button>
              </div>
            )}
            <button type="button" className="btn btn-primary btn-big ms-solve" onClick={toggleSolve}>
              {solving ? <StopIcon width={16} height={16} /> : <PlayIcon width={16} height={16} />}
              {solving ? "Stop" : "Watch it solve"}
            </button>
          </div>
        )}
      </div>

      <p className="ms-best">
        {record ? (
          <>
            <span className="ms-medal" aria-hidden="true" />
            <span>
              Best on {board.name}: {bestText(record)}
            </span>
          </>
        ) : (
          `No best on ${board.name} yet.`
        )}
      </p>
    </div>
  );
}
