import { BOARDS } from "../logic/boards";
import { drawingOf } from "../logic/drawing";

import "@/games/knights-tour/board-styles.css";

// A game a few jumps in: "o" a marble, "." an empty hole.
const ROWS = ["  o.o  ", "  ooo  ", "oo.oooo", "ooo.ooo", "ooooo.o", "  ooo  ", "  o.o  "];
const CELL = 9.4;
const LEFT = (92 - 7 * CELL) / 2;
const TOP = (124 - 7 * CELL) / 2;
const drawing = drawingOf(BOARDS.english);

/** Card picture for the games list: the wooden cross with its marbles on a marble violet card. */
export function MarbleSolitaireThumb() {
  return (
    <svg viewBox="0 0 92 124" width="92" height="124" className="game-thumb" aria-hidden="true" data-kt-board="wood">
      <rect x="0.5" y="0.5" width="91" height="123" rx="10" style={{ fill: "var(--violet)", stroke: "var(--ink)" }} />
      <rect x="6" y="6" width="80" height="112" rx="6" style={{ fill: "none", stroke: "var(--on-red)", strokeOpacity: 0.35, strokeWidth: 1.5 }} />
      <g transform={`translate(${LEFT + CELL / 2} ${TOP + CELL / 2}) scale(${CELL})`}>
        <path d={drawing.rim} style={{ fill: "var(--board-frame)", stroke: "var(--board-frame)", strokeWidth: 0.34, strokeLinejoin: "round" }} />
        <path d={drawing.slab} style={{ fill: "var(--sq-light)", stroke: "var(--sq-light)", strokeWidth: 0.14, strokeLinejoin: "round" }} />
        {ROWS.flatMap((row, r) =>
          [...row].map((ch, c) =>
            ch === " " ? null : ch === "o" ? (
              <circle key={`${r}-${c}`} cx={c} cy={r} r={0.38} style={{ fill: "var(--violet)", stroke: "var(--ink)", strokeWidth: 0.08 }} />
            ) : (
              <circle key={`${r}-${c}`} cx={c} cy={r} r={0.2} style={{ fill: "var(--board-frame)" }} />
            ),
          ),
        )}
      </g>
    </svg>
  );
}
