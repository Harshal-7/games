import { analyse } from "../logic/solver";
import { KNIGHT_PATH } from "./knight-piece";

import "./knights-tour.css";

const SIZE = 5;
const SHOWN = 9;

/** Card picture for the games list: a 5×5 board with the start of a real tour. */
export function KnightsTourThumb() {
  const result = analyse([0], SIZE);
  const tour = result.status === "solvable" ? [0, ...result.completion].slice(0, SHOWN) : [0];
  const centre = (sq: number) => [(sq % SIZE) + 0.5, Math.floor(sq / SIZE) + 0.5] as const;
  const knight = centre(tour[tour.length - 1]);

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="kt-thumb" aria-hidden="true">
      {Array.from({ length: SIZE * SIZE }, (_, sq) => (
        <rect
          key={sq}
          x={sq % SIZE}
          y={Math.floor(sq / SIZE)}
          width="1"
          height="1"
          className={(Math.floor(sq / SIZE) + (sq % SIZE)) % 2 ? "kt-thumb-dark" : "kt-thumb-light"}
        />
      ))}
      <polyline
        points={tour.map((sq) => centre(sq).join(",")).join(" ")}
        className="kt-thumb-trail"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {tour.slice(0, -1).map((sq) => (
        <circle key={sq} cx={centre(sq)[0]} cy={centre(sq)[1]} r="0.09" className="kt-thumb-dot" />
      ))}
      <g transform={`translate(${knight[0] - 0.42} ${knight[1] - 0.44}) scale(0.0084)`}>
        <path d={KNIGHT_PATH} fillRule="evenodd" className="kt-thumb-knight" />
      </g>
    </svg>
  );
}
