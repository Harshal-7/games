/**
 * Board and knight styles the player can pick in Settings. Board colours live in
 * CSS under [data-kt-board="<id>"]; knight drawings in ui/knight-piece.tsx.
 */

export const BOARD_STYLES = [
  { id: "stone", label: "Stone" },
  { id: "tournament", label: "Tournament" },
  { id: "slate", label: "Slate" },
] as const;
export type BoardStyleId = (typeof BOARD_STYLES)[number]["id"];

export const PIECE_STYLES = [
  { id: "classic", label: "Classic" },
  { id: "line", label: "Line" },
  { id: "pixel", label: "Pixel" },
] as const;
export type PieceStyleId = (typeof PIECE_STYLES)[number]["id"];
