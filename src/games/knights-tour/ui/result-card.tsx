"use client";

import { count } from "@/ui/format";
import { CheckIcon } from "@/ui/icons";

import type { Size } from "../logic/board";
import type { Game } from "../logic/game";

type ResultCardProps = {
  outcome: "won" | "stuck";
  game: Game;
  closed: boolean;
  newBest: boolean;
  /** For a stuck knight: the last move the tour could still be finished from. */
  backTo: number | null;
  nextSize: Size | null;
  onRestart: () => void;
  onUndo: () => void;
  onBack: () => void;
  onNextSize: () => void;
};

/** Takes the place of the buttons under the board when the tour ends, either way. */
export function ResultCard(props: ResultCardProps) {
  const { outcome, game, closed, newBest, backTo, nextSize } = props;
  const total = game.size * game.size;

  if (outcome === "won") {
    const tags = [
      newBest && { label: "New best", accent: true },
      closed && { label: "Closed tour", accent: false },
    ].filter((tag) => tag !== false);
    return (
      <div className="kt-result" role="status">
        <div className="kt-result-head">
          <span className="kt-result-icon" aria-hidden="true">
            <CheckIcon width={20} height={20} strokeWidth={2.4} />
          </span>
          <div>
            <h2>All {total} squares visited</h2>
            <p>
              {game.assisted
                ? "Solved by Watch it solve, so not counted for best time"
                : `${count(game.undos, "undo")} · ${count(game.hints, "hint")}`}
            </p>
          </div>
        </div>
        {tags.length > 0 && (
          <div className="kt-tags">
            {tags.map(({ label, accent }) => (
              <span key={label} className={accent ? "kt-tag is-accent" : "kt-tag"}>
                {label}
              </span>
            ))}
          </div>
        )}
        <div className="kt-result-actions">
          <button type="button" className="btn btn-primary" onClick={props.onRestart} autoFocus>
            Play again
          </button>
          {nextSize && (
            <button type="button" className="btn" onClick={props.onNextSize}>
              Next: {nextSize}×{nextSize}
            </button>
          )}
        </div>
      </div>
    );
  }

  const showBack = backTo !== null && backTo > 0 && backTo < game.path.length - 1;
  return (
    <div className="kt-result" role="status">
      <div className="kt-result-head">
        <div>
          <h2>No square left to jump to</h2>
          <p>
            {game.path.length} of {total} visited. Step back and try another way.
          </p>
        </div>
      </div>
      <div className="kt-result-actions">
        <button type="button" className="btn btn-primary" onClick={props.onUndo} autoFocus>
          Undo
        </button>
        {showBack && (
          <button
            type="button"
            className="btn"
            onClick={props.onBack}
            title="The last move this tour could still be finished from"
          >
            Back to move {backTo}
          </button>
        )}
        <button type="button" className="btn btn-quiet" onClick={props.onRestart}>
          Restart
        </button>
      </div>
    </div>
  );
}
