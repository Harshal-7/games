import type { SVGProps } from "react";

/** The knight, drawn for this game: a simple side-on horse head on a base. */
export const KNIGHT_PATH =
  "M30 81C30 70 33 63 40 57C35 56 30 55 26 54C20.5 52.5 18.5 47 22 43L34 29C37 25.5 40 22.5 43.5 21L46.5 11.5L52.5 21C65 24 74.5 34.5 75.5 50C76.5 62 73 72 70.5 81Z" +
  "M43 34a2.8 2.8 0 1 0-5.6 0a2.8 2.8 0 1 0 5.6 0Z" +
  "M25 84.5h50a3 3 0 0 1 3 3v1.5a3 3 0 0 1-3 3h-50a3 3 0 0 1-3-3v-1.5a3 3 0 0 1 3-3Z";

export function KnightPiece(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false" {...props}>
      <path d={KNIGHT_PATH} fillRule="evenodd" fill="currentColor" />
    </svg>
  );
}
