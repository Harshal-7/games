"use client";

import { count, formatDuration } from "@/ui/format";

import type { Size } from "../logic/board";
import type { Game } from "../logic/game";

type ResultPanelProps = {
  outcome: "won" | "stuck";
  game: Game;
  time: number;
  closed: boolean;
  newBest: boolean;
  /** For a stuck knight: the last move the tour could still be finished from. */
  backTo: number | null;
  onRestart: () => void;
  onUndo: () => void;
  onBack: () => void;
  onNextSize: (() => void) | null;
  nextSize: Size | null;
  onClose: () => void;
};

/** Shown over the board when the tour ends, either way. */
export function ResultPanel(props: ResultPanelProps) {
  const { outcome, game, time, closed, newBest, backTo } = props;
  const total = game.size * game.size;
  const stats = [formatDuration(time), count(game.undos, "undo"), count(game.hints, "hint")].join(" · ");

  if (outcome === "won") {
    return (
      <div className="kt-panel-wrap">
        <div className="kt-panel" role="dialog" aria-labelledby="kt-panel-title" aria-describedby="kt-panel-body">
          <div className="kt-badges">
            {closed && <span className="kt-badge">Closed tour</span>}
            {newBest && <span className="kt-badge is-accent">New best</span>}
          </div>
          <h2 id="kt-panel-title">Tour complete</h2>
          <p id="kt-panel-body">
            All {total} squares on {game.size}×{game.size}.
            <br />
            <span className="kt-stats">{stats}</span>
          </p>
          {game.assisted && <p className="kt-note">Watch it solve finished this one, so it doesn&apos;t count for best time.</p>}
          {closed && !game.assisted && (
            <p className="kt-note">The last square is one jump from the first, so the tour loops.</p>
          )}
          <div className="kt-panel-actions">
            <button type="button" className="btn btn-primary" onClick={props.onRestart} autoFocus>
              Play again
            </button>
            {props.onNextSize && props.nextSize && (
              <button type="button" className="btn" onClick={props.onNextSize}>
                Try {props.nextSize}×{props.nextSize}
              </button>
            )}
            <button type="button" className="btn btn-quiet" onClick={props.onClose}>
              View board
            </button>
          </div>
        </div>
      </div>
    );
  }

  const length = game.path.length;
  const showBack = backTo !== null && backTo > 0 && backTo < length - 1;
  return (
    <div className="kt-panel-wrap">
      <div className="kt-panel" role="dialog" aria-labelledby="kt-panel-title" aria-describedby="kt-panel-body">
        <h2 id="kt-panel-title">
          Stuck at {length} of {total}
        </h2>
        <p id="kt-panel-body">The knight has no new square to jump to.</p>
        {showBack && <p className="kt-note">Move {backTo} is the last point this tour could still be finished from.</p>}
        <div className="kt-panel-actions">
          {showBack && (
            <button type="button" className="btn btn-primary" onClick={props.onBack} autoFocus>
              Back to move {backTo}
            </button>
          )}
          <button type="button" className={showBack ? "btn" : "btn btn-primary"} onClick={props.onUndo} autoFocus={!showBack}>
            Undo
          </button>
          <button type="button" className="btn btn-quiet" onClick={props.onRestart}>
            Restart
          </button>
        </div>
      </div>
    </div>
  );
}
