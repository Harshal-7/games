import { KNIGHT_PATH } from "./knight-piece";

import "../board-styles.css";

// Three by three squares of the board style you picked, inside its frame.
const SQUARES = Array.from({ length: 9 }, (_, i) => ({
  x: 17 + (i % 3) * 19.33,
  y: 31 + Math.floor(i / 3) * 20.67,
  dark: (Math.floor(i / 3) + (i % 3)) % 2 === 1,
}));

/** Card picture for the games list: a playing card with a corner of the board, the knight and a brass dot. */
export function KnightsTourThumb() {
  return (
    <svg viewBox="0 0 92 124" width="92" height="124" className="game-thumb" aria-hidden="true">
      <rect x="0.5" y="0.5" width="91" height="123" rx="10" style={{ fill: "var(--inset)", stroke: "var(--card-line)" }} />
      <text x="9" y="18" className="game-thumb-corner">
        K
      </text>
      <text x="83" y="114" textAnchor="end" className="game-thumb-corner">
        K
      </text>
      <rect x="13" y="27" width="66" height="70" rx="4" style={{ fill: "var(--board-frame)" }} />
      {SQUARES.map(({ x, y, dark }) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="19.4" height="20.7" style={{ fill: dark ? "var(--sq-dark)" : "var(--sq-light)" }} />
      ))}
      <g transform="translate(31 46) scale(0.36)">
        <path d={KNIGHT_PATH} fillRule="evenodd" style={{ fill: "var(--ink)" }} />
      </g>
      <circle cx="65.3" cy="41.3" r="3.6" style={{ fill: "var(--brass)", stroke: "var(--ink)", strokeWidth: 1.4 }} />
    </svg>
  );
}
