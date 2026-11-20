import type { BoardId } from "../logic/boards";

/** The outline of each board, in the board picker. Stroke icons like src/ui/icons.tsx. */
const SHAPES: Record<BoardId, string> = {
  triangle: "M8 2.2L14.2 13.3H1.8Z",
  english: "M5.6 1.5h4.8v4.1h4.1v4.8h-4.1v4.1H5.6v-4.1H1.5V5.6h4.1Z",
  european: "M5.6 1.5h4.8v1.8h1.8v2.3h2.3v4.8h-2.3v2.3h-1.8v1.8H5.6v-1.8H3.8v-2.3H1.5V5.6h2.3V3.3h1.8Z",
};

export function BoardShape({ board }: { board: BoardId }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={SHAPES[board]} />
    </svg>
  );
}
