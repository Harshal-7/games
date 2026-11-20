import type { BoardId } from "./boards";

/**
 * One way to finish each board from its start with the last marble in the goal hole,
 * found once by the solver and checked by a test. Watch it solve and Hint follow it
 * while the game is still on this line, so the start (the hardest place to search
 * from) never needs a search. Each jump is [from row, from col, to row, to col].
 */
export const BOOK: Record<BoardId, readonly (readonly [number, number, number, number])[]> = {
  triangle: [
    [2, 0, 0, 0], [4, 2, 2, 0], [4, 0, 4, 2], [3, 0, 1, 0], [0, 0, 2, 0], [1, 1, 3, 1], [4, 3, 4, 1],
    [2, 0, 4, 2], [4, 1, 4, 3], [4, 4, 4, 2], [3, 3, 1, 1], [4, 2, 2, 2], [2, 2, 0, 0],
  ],
  english: [
    [1, 3, 3, 3], [2, 1, 2, 3], [0, 2, 2, 2], [0, 4, 0, 2], [2, 3, 2, 1], [2, 0, 2, 2], [2, 5, 2, 3],
    [2, 2, 2, 4], [4, 0, 2, 0], [4, 1, 2, 1], [2, 0, 2, 2], [3, 2, 1, 2], [0, 2, 2, 2], [5, 2, 3, 2],
    [2, 2, 4, 2], [5, 4, 5, 2], [5, 2, 3, 2], [3, 4, 5, 4], [4, 6, 4, 4], [1, 4, 3, 4], [2, 6, 4, 6],
    [4, 3, 4, 5], [6, 4, 4, 4], [6, 2, 6, 4], [3, 4, 5, 4], [6, 4, 4, 4], [3, 2, 3, 4], [3, 4, 5, 4],
    [4, 6, 4, 4], [5, 4, 3, 4], [3, 5, 3, 3],
  ],
  european: [
    [1, 5, 1, 3], [3, 4, 1, 4], [5, 4, 3, 4], [2, 6, 2, 4], [2, 3, 2, 5], [2, 1, 2, 3], [4, 6, 2, 6],
    [2, 6, 2, 4], [4, 2, 4, 4], [4, 0, 4, 2], [3, 4, 5, 4], [2, 3, 4, 3], [4, 3, 4, 1], [1, 4, 3, 4],
    [6, 4, 4, 4], [3, 5, 3, 3], [3, 2, 3, 4], [5, 5, 3, 5], [6, 2, 4, 2], [6, 3, 4, 3], [4, 3, 4, 5],
    [4, 5, 2, 5], [0, 3, 2, 3], [0, 2, 2, 2], [2, 2, 2, 4], [3, 4, 1, 4], [0, 4, 2, 4], [2, 5, 2, 3],
    [4, 1, 2, 1], [2, 0, 2, 2], [2, 3, 2, 1], [1, 1, 3, 1], [3, 0, 3, 2], [3, 2, 5, 2], [5, 1, 5, 3],
  ],
};
