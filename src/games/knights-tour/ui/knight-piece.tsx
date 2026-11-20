import type { ComponentType, SVGProps } from "react";

import type { PieceStyleId } from "../styles";

/* The knight drawings: a side-on horse head on a base, in three styles. */

const BODY =
  "M30 81C30 70 33 63 40 57C35 56 30 55 26 54C20.5 52.5 18.5 47 22 43L34 29C37 25.5 40 22.5 43.5 21L46.5 11.5L52.5 21C65 24 74.5 34.5 75.5 50C76.5 62 73 72 70.5 81Z";
const EYE = "M43 34a2.8 2.8 0 1 0-5.6 0a2.8 2.8 0 1 0 5.6 0Z";
const BASE = "M25 84.5h50a3 3 0 0 1 3 3v1.5a3 3 0 0 1-3 3h-50a3 3 0 0 1-3-3v-1.5a3 3 0 0 1 3-3Z";

/** The classic knight as one path (eye cut out), for small drawings like the card picture. */
export const KNIGHT_PATH = BODY + EYE + BASE;

type PieceProps = SVGProps<SVGSVGElement>;

function ClassicKnight(props: PieceProps) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false" {...props}>
      <path d={KNIGHT_PATH} fillRule="evenodd" fill="currentColor" />
    </svg>
  );
}

function LineKnight(props: PieceProps) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false" {...props}>
      <path d={BODY} fill="none" stroke="currentColor" strokeWidth="5.5" strokeLinejoin="round" />
      <circle cx="40.2" cy="34" r="3.4" fill="currentColor" />
      <path d="M25 88.5h50" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

// 12 × 14 pixels, # = filled. Facing left like the others.
const PIXELS = [
  ".....#......",
  ".....##.....",
  "....####....",
  "...######...",
  "..##.#####..",
  ".#########..",
  "##########..",
  "###..######.",
  ".....######.",
  "....#######.",
  "....#######.",
  "...########.",
  ".##########.",
  ".##########.",
];
const PIXEL_PATH = PIXELS.flatMap((row, y) =>
  [...row.matchAll(/#+/g)].map((run) => `M${run.index} ${y}h${run[0].length}v1h-${run[0].length}Z`),
).join("");

function PixelKnight(props: PieceProps) {
  return (
    <svg viewBox="-1 -0.5 14 15" aria-hidden="true" focusable="false" shapeRendering="crispEdges" {...props}>
      <path d={PIXEL_PATH} fill="currentColor" />
    </svg>
  );
}

export const PIECES: Record<PieceStyleId, ComponentType<PieceProps>> = {
  classic: ClassicKnight,
  line: LineKnight,
  pixel: PixelKnight,
};
