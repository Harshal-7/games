"use client";

import { count } from "@/ui/format";
import { CheckIcon, RestartIcon, UndoIcon } from "@/ui/icons";

/** Takes the buttons' place when the last line is in. */
export function DoneCard(props: {
  title: string;
  undos: number;
  hints: number;
  assisted: boolean;
  newBest: boolean;
  /** The main button: the next pattern, or a new Endless one. */
  next: { label: string; onClick: () => void } | null;
  onAgain: () => void;
}) {
  const { title, undos, hints, assisted, newBest, next } = props;
  const tags = [!assisted && hints === 0 && { label: "No hints", best: false }, newBest && { label: "New best", best: true }].filter(
    (tag) => tag !== false,
  );
  return (
    <div className="card nl-result" role="status">
      <div className="nl-result-head">
        <span className="nl-result-icon" aria-hidden="true">
          <CheckIcon width={20} height={20} strokeWidth={2.8} />
        </span>
        <div>
          <h2>{title}</h2>
          <div className="nl-result-meta">
            <span>
              {assisted
                ? "Drawn by Watch it solve, so no best time"
                : hints > 0
                  ? `${count(undos, "undo")} · ${count(hints, "hint")}`
                  : count(undos, "undo")}
            </span>
            {tags.map(({ label, best }) => (
              <span key={label} className={best ? "nl-tag is-best" : "nl-tag"}>
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="nl-result-actions">
        {next && (
          <button type="button" className="btn btn-primary" onClick={next.onClick} autoFocus>
            {next.label}
          </button>
        )}
        <button type="button" className={next ? "btn" : "btn btn-primary"} onClick={props.onAgain} autoFocus={!next}>
          Draw again
        </button>
      </div>
    </div>
  );
}

/** Takes the buttons' place when the lines left can't all be drawn from the pen. */
export function StuckCard(props: {
  drawn: number;
  /** The last line count it could still be finished from; -1 when even the start dot can't. */
  backTo: number;
  onUndo: () => void;
  onBack: () => void;
  onRestart: () => void;
}) {
  const { drawn, backTo } = props;
  const wrongStart = backTo < 0;
  const showBack = backTo >= 0 && backTo < drawn - 1;
  return (
    <div className="card nl-result is-stuck" role="status">
      <div>
        <h2>Can&apos;t finish from here</h2>
        <p>
          {wrongStart
            ? "This pattern can't be drawn from the dot it started on. Start again from a glowing dot."
            : "The lines left can't all be drawn from this dot. Step back and try another way."}
        </p>
      </div>
      <button type="button" className="btn btn-primary nl-result-main" onClick={wrongStart ? props.onRestart : props.onUndo} autoFocus>
        {wrongStart ? <RestartIcon width={17} height={17} strokeWidth={2.6} /> : <UndoIcon width={17} height={17} strokeWidth={2.6} />}
        {wrongStart ? "Start again" : "Undo"}
      </button>
      {!wrongStart && (
        <div className="nl-result-more">
          {showBack && (
            <button type="button" className="btn" onClick={props.onBack} title="The last line this drawing could still be finished from">
              {backTo === 0 ? "Back to the start" : `Back to line ${backTo}`}
            </button>
          )}
          <button type="button" className="btn" onClick={props.onRestart}>
            <RestartIcon width={16} height={16} strokeWidth={2.6} />
            Restart
          </button>
        </div>
      )}
    </div>
  );
}
