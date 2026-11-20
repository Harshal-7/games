"use client";

import { count, formatDuration } from "@/ui/format";
import { CheckIcon, RestartIcon, UndoIcon } from "@/ui/icons";

import type { Board, BoardId } from "../logic/boards";
import type { Game, Result } from "../logic/game";

/** Where a Perfect ends, in words. */
const GOAL_WORDS: Record<BoardId, string> = {
  triangle: "back at the top",
  english: "in the centre",
  european: "in the goal hole",
};

type ResultCardProps = {
  result: Result;
  board: Board;
  game: Game;
  time: number;
  newBest: boolean;
  /** When one marble could have been reached earlier: the jumps to keep to get back there. */
  back: number | null;
  nextBoard: BoardId | null;
  onRestart: () => void;
  onUndo: () => void;
  onBack: (to: number) => void;
  onNext: () => void;
};

/** Takes the place of the buttons under the board when no jump is left. */
export function ResultCard(props: ResultCardProps) {
  const { result, board, game, time, newBest, back, nextBoard } = props;
  const clock = formatDuration(time);

  if (result.left === 1) {
    const where = result.kind === "perfect" ? `One marble, ${GOAL_WORDS[board.id]}` : "One marble left";
    const tags = [
      newBest && { label: "New best", best: true },
      !game.assisted && game.hints === 0 && { label: "No hints", best: false },
    ].filter((tag) => tag !== false);
    return (
      <div className="card ms-result" role="status">
        <div className="ms-result-head">
          <span className="ms-result-icon" aria-hidden="true">
            <CheckIcon width={20} height={20} strokeWidth={2.8} />
          </span>
          <div>
            <h2>{result.title}</h2>
            <div className="ms-result-meta">
              <span>
                {game.assisted
                  ? "Finished by Watch it solve, so not counted for your best"
                  : `${where} · ${clock}${game.hints > 0 ? ` · ${count(game.hints, "hint")}` : ""}`}
              </span>
              {tags.map(({ label, best }) => (
                <span key={label} className={best ? "ms-tag is-best" : "ms-tag"}>
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="ms-result-actions">
          <button type="button" className="btn btn-primary" onClick={props.onRestart} autoFocus>
            Play again
          </button>
          {nextBoard && (
            <button type="button" className="btn" onClick={props.onNext}>
              Next: {nextBoard === "english" ? "English cross" : nextBoard === "european" ? "European" : "Triangle"}
            </button>
          )}
        </div>
      </div>
    );
  }

  const hints = game.hints > 0 ? ` · ${count(game.hints, "hint")}` : "";
  return (
    <div className="card ms-result is-left" role="status">
      <div>
        <h2>{result.title}</h2>
        <p>
          No jumps left · <span className="ms-num">{clock}</span>
          {hints}.{back !== null && ` One marble could still be reached up to move ${back}.`}
        </p>
      </div>
      {back !== null ? (
        <button
          type="button"
          className="btn btn-primary ms-result-main"
          onClick={() => props.onBack(back)}
          title="The last move one marble could still be reached from"
          autoFocus
        >
          Back to move {back}
        </button>
      ) : (
        <button type="button" className="btn btn-primary ms-result-main" onClick={props.onUndo} autoFocus>
          <UndoIcon width={17} height={17} strokeWidth={2.6} />
          Undo
        </button>
      )}
      <div className="ms-result-more">
        {back !== null && (
          <button type="button" className="btn" onClick={props.onUndo}>
            <UndoIcon width={16} height={16} strokeWidth={2.6} />
            Undo
          </button>
        )}
        <button type="button" className="btn" onClick={props.onRestart}>
          <RestartIcon width={16} height={16} strokeWidth={2.6} />
          Play again
        </button>
      </div>
    </div>
  );
}

/**
 * Jumps are left but one marble can't be reached any more: the small card that takes
 * the place of Undo, Hint and Restart. Playing on is still fine, for fewer marbles.
 */
export function OutOfReach({
  back,
  onUndo,
  onBack,
  onRestart,
}: {
  back: number | null;
  onUndo: () => void;
  onBack: (to: number) => void;
  onRestart: () => void;
}) {
  return (
    <div className="card ms-reach" role="status">
      <div>
        <h2>One marble is out of reach now</h2>
        <p>Play on to leave as few as you can, or step back.</p>
      </div>
      <div className={back !== null ? "ms-reach-actions" : "ms-reach-actions is-two"}>
        <button type="button" className="btn" onClick={onUndo} title="Undo (U)">
          <UndoIcon width={16} height={16} strokeWidth={2.6} />
          Undo
        </button>
        {back !== null && (
          <button
            type="button"
            className="btn"
            onClick={() => onBack(back)}
            title="The last move one marble could still be reached from"
          >
            Back to move {back}
          </button>
        )}
        <button type="button" className="btn ms-restart" onClick={onRestart} aria-label="Restart" title="Restart">
          <RestartIcon width={17} height={17} strokeWidth={2.6} />
        </button>
      </div>
    </div>
  );
}
