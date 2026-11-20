/**
 * The three boards: where the holes are, every legal jump, the starting empty hole, the
 * goal hole for "Perfect", and the board's symmetries.
 *
 * Holes are numbered row by row from the top. Square boards use (row, col) on a 7×7
 * grid and jump in four directions. The triangle uses (row, col) with col ≤ row and
 * jumps along its three directions: along a row, and down either side.
 */

export const BOARD_IDS = ["triangle", "english", "european"] as const;
export type BoardId = (typeof BOARD_IDS)[number];

export const DEFAULT_BOARD: BoardId = "english";

export type Hole = {
  row: number;
  col: number;
  /** Where to draw it, in hole spacings from the top left of the board's box. */
  x: number;
  y: number;
};

/** A jump: the marble on `from` hops over `over` into the empty `to`. */
export type Jump = { from: number; over: number; to: number };

export type Board = {
  id: BoardId;
  name: string;
  holes: readonly Hole[];
  jumps: readonly Jump[];
  /** The one empty hole at the start. */
  start: number;
  /**
   * One marble left here is "Perfect": the centre of the English cross, the triangle's
   * top, and on the European board the hole opposite the start (it can't end in the centre).
   */
  goal: number;
  /** The drawing's box, in hole spacings. */
  width: number;
  height: number;
  /** Every way to turn or flip the board onto itself, as hole → hole (the first is "as is"). */
  symmetries: readonly (readonly number[])[];
  /**
   * Colourings for the position class: each hole's colour (0, 1 or 2). A jump always
   * covers three holes of different colours on each, so the parity of every colour's
   * count flips together and their differences never change.
   */
  colourings: readonly (readonly number[])[];
};

export function isBoardId(value: unknown): value is BoardId {
  return typeof value === "string" && (BOARD_IDS as readonly string[]).includes(value);
}

/** The 7×7 cross boards. `corners` adds the four extra holes of the European board. */
function squareBoard(
  id: BoardId,
  name: string,
  corners: boolean,
  start: [number, number],
  goal: [number, number],
): Board {
  const inside = (r: number, c: number) =>
    r >= 0 &&
    r < 7 &&
    c >= 0 &&
    c < 7 &&
    (Math.abs(r - 3) <= 1 || Math.abs(c - 3) <= 1 || (corners && Math.abs(r - 3) === 2 && Math.abs(c - 3) === 2));
  const holes: Hole[] = [];
  const index = new Map<string, number>();
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      if (!inside(r, c)) continue;
      index.set(`${r},${c}`, holes.length);
      holes.push({ row: r, col: c, x: c, y: r });
    }
  }
  const at = (r: number, c: number) => index.get(`${r},${c}`) ?? -1;
  const jumps: Jump[] = [];
  for (const [i, { row: r, col: c }] of holes.entries()) {
    for (const [dr, dc] of [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ]) {
      const over = at(r + dr, c + dc);
      const to = at(r + 2 * dr, c + 2 * dc);
      if (over >= 0 && to >= 0) jumps.push({ from: i, over, to });
    }
  }
  const turns: ((r: number, c: number) => [number, number])[] = [
    (r, c) => [r, c],
    (r, c) => [c, 6 - r],
    (r, c) => [6 - r, 6 - c],
    (r, c) => [6 - c, r],
    (r, c) => [r, 6 - c],
    (r, c) => [6 - r, c],
    (r, c) => [c, r],
    (r, c) => [6 - c, 6 - r],
  ];
  const mod3 = (n: number) => ((n % 3) + 3) % 3;
  return {
    id,
    name,
    holes,
    jumps,
    start: at(...start),
    goal: at(...goal),
    width: 7,
    height: 7,
    symmetries: turns.map((turn) => holes.map(({ row, col }) => at(...turn(row, col)))),
    colourings: [holes.map(({ row, col }) => mod3(row + col)), holes.map(({ row, col }) => mod3(row - col))],
  };
}

/** The 15-hole triangle, five rows, empty at the top; "Perfect" ends back at the top. */
function triangleBoard(): Board {
  const rows = 5;
  const holes: Hole[] = [];
  const index = new Map<string, number>();
  const h = Math.sqrt(3) / 2;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c <= r; c++) {
      index.set(`${r},${c}`, holes.length);
      holes.push({ row: r, col: c, x: (rows - 1) / 2 + c - r / 2, y: r * h });
    }
  }
  const at = (r: number, c: number) => index.get(`${r},${c}`) ?? -1;
  const jumps: Jump[] = [];
  for (const [i, { row: r, col: c }] of holes.entries()) {
    // Along the row, and down (or up) either side.
    for (const [dr, dc] of [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
      [1, 1],
      [-1, -1],
    ]) {
      const over = at(r + dr, c + dc);
      const to = at(r + 2 * dr, c + 2 * dc);
      if (over >= 0 && to >= 0) jumps.push({ from: i, over, to });
    }
  }
  // Turning and flipping a triangle swaps its three corners. In corner-distance terms a
  // hole is (a, b, d) with a + b + d = 4: a = row − col, b = col, d = 4 − row.
  const n = rows - 1;
  const perms: ((t: [number, number, number]) => [number, number, number])[] = [
    ([a, b, d]) => [a, b, d],
    ([a, b, d]) => [b, d, a],
    ([a, b, d]) => [d, a, b],
    ([a, b, d]) => [b, a, d],
    ([a, b, d]) => [a, d, b],
    ([a, b, d]) => [d, b, a],
  ];
  const symmetries = perms.map((perm) =>
    holes.map(({ row, col }) => {
      const [, b, d] = perm([row - col, col, n - row]);
      return at(n - d, b);
    }),
  );
  return {
    id: "triangle",
    name: "Triangle",
    holes,
    jumps,
    start: at(0, 0),
    goal: at(0, 0),
    width: rows - 1,
    height: (rows - 1) * h,
    symmetries,
    colourings: [holes.map(({ row, col }) => (row + col) % 3)],
  };
}

export const BOARDS: Record<BoardId, Board> = {
  triangle: triangleBoard(),
  // The classic: empty in the centre, and the last marble back in the centre.
  english: squareBoard("english", "English cross", false, [3, 3], [3, 3]),
  // No single empty hole on this board can end in the centre, so it starts one hole in
  // from the top and ends in the mirror hole, one in from the bottom.
  european: squareBoard("european", "European", true, [1, 3], [5, 3]),
};

/** Jumps grouped by the hole they start from. */
const jumpsFromCache = new Map<BoardId, readonly (readonly Jump[])[]>();
export function jumpsFrom(board: Board): readonly (readonly Jump[])[] {
  let table = jumpsFromCache.get(board.id);
  if (!table) {
    const grouped: Jump[][] = board.holes.map(() => []);
    for (const jump of board.jumps) grouped[jump.from].push(jump);
    table = grouped;
    jumpsFromCache.set(board.id, table);
  }
  return table;
}
