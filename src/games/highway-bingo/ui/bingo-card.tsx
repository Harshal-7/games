"use client";

import { useState, type CSSProperties } from "react";

import type { Card } from "../logic/card";
import { Milestone } from "./marks";

/** How tall a square is for its width: 5×5 squares are a little tall, to fit two lines of label. */
const TALL = { 5: 1.12, 4: 1 } as const;

/**
 * A bingo card: big squares, each an emoji and a short label. Tap to stamp, tap again to
 * take it off. Finished lines get a marker stroke drawn through them. Without `onMark`
 * it's read-only (Check a card).
 */
export function BingoCard({
  card,
  marks,
  lit = [],
  onMark,
  fresh,
  onFresh,
  label,
}: {
  card: Card;
  marks: readonly number[];
  /** Finished lines, drawn through. */
  lit?: number[][];
  onMark?: (cell: number) => void;
  /** The square just stamped: its stamp lands once. */
  fresh?: number | null;
  onFresh?: () => void;
  /** What the card is, for screen readers ("Seat 2's card"). */
  label: string;
}) {
  const on = new Set(marks);
  const litCells = new Set(lit.flat());
  const n = card.size;
  const tall = TALL[n];

  return (
    <div className={`hb-card is-${n}`} role="group" aria-label={label} style={{ "--tall": tall } as CSSProperties}>
      <div className="hb-grid">
        {card.cells.map((sight, i) => {
          const classes = ["hb-cell", litCells.has(i) ? "is-lit" : null];
          if (!sight) {
            return (
              <div key="free" className={[...classes, "is-free"].filter(Boolean).join(" ")}>
                <Milestone top="" lines={["", ""]} className="hb-free-stone" />
                <span className="hb-free-text">Free</span>
              </div>
            );
          }
          const marked = on.has(i);
          const inside = (
            <>
              <span className="hb-emoji" aria-hidden="true">
                {sight.emoji}
                {marked && (
                  <span className={fresh === i ? "hb-stamp is-landing" : "hb-stamp"} onAnimationEnd={onFresh} />
                )}
              </span>
              <span className={longestWord(sight.label) >= 9 ? "hb-label is-long" : "hb-label"}>{sight.label}</span>
            </>
          );
          if (!onMark) {
            return (
              <div key={sight.id} className={classes.filter(Boolean).join(" ")}>
                {inside}
              </div>
            );
          }
          return (
            <button
              key={sight.id}
              type="button"
              className={classes.filter(Boolean).join(" ")}
              aria-pressed={marked}
              onClick={() => onMark(i)}
            >
              {inside}
            </button>
          );
        })}
      </div>
      {lit.length > 0 && (
        <svg className="hb-lines" viewBox={`0 0 ${n} ${n * tall}`} aria-hidden="true">
          {lit.map((line) => (
            <DrawnLine key={line.join()} line={line} size={n} tall={tall} />
          ))}
        </svg>
      )}
    </div>
  );
}

function longestWord(label: string): number {
  return Math.max(...label.split(/[\s-]+/).map((w) => w.length));
}

/**
 * A marker stroke from the first square of a line to the last, past both ends a little.
 * It draws once; Next replays CSS animations when a kept page shows again, so once
 * drawn it switches to a still class.
 */
function DrawnLine({ line, size, tall }: { line: number[]; size: number; tall: number }) {
  const [drawn, setDrawn] = useState(false);
  const centre = (cell: number) => [(cell % size) + 0.5, (Math.floor(cell / size) + 0.5) * tall];
  const [x1, y1] = centre(line[0]);
  const [x2, y2] = centre(line[line.length - 1]);
  const dx = (x2 - x1) / (size - 1);
  const dy = (y2 - y1) / (size - 1);
  const reach = 0.32;
  const d = `M${x1 - dx * reach} ${y1 - dy * reach}L${x2 + dx * reach} ${y2 + dy * reach}`;
  return (
    <g className={drawn ? "hb-line" : "hb-line is-drawing"} onAnimationEnd={() => setDrawn(true)}>
      <path d={d} pathLength={1} className="hb-line-under" />
      <path d={d} pathLength={1} className="hb-line-ink" />
    </g>
  );
}
