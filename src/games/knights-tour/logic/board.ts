/**
 * Board basics for the Knight's Tour. A square is a number: row * size + col,
 * with row 0 at the top of the screen.
 */

export const SIZES = [5, 6, 7, 8] as const;
export type Size = (typeof SIZES)[number];

export function isSize(value: unknown): value is Size {
  return SIZES.includes(value as Size);
}

const DELTAS: readonly (readonly [number, number])[] = [
  [-2, -1],
  [-2, 1],
  [-1, -2],
  [-1, 2],
  [1, -2],
  [1, 2],
  [2, -1],
  [2, 1],
];

const neighbourCache = new Map<number, readonly (readonly number[])[]>();

/** For every square, the squares a knight can jump to from it. */
export function knightMoves(size: number): readonly (readonly number[])[] {
  let table = neighbourCache.get(size);
  if (!table) {
    table = Array.from({ length: size * size }, (_, sq) => {
      const row = Math.floor(sq / size);
      const col = sq % size;
      const out: number[] = [];
      for (const [dr, dc] of DELTAS) {
        const r = row + dr;
        const c = col + dc;
        if (r >= 0 && r < size && c >= 0 && c < size) out.push(r * size + c);
      }
      return out;
    });
    neighbourCache.set(size, table);
  }
  return table;
}

export function isKnightMove(from: number, to: number, size: number): boolean {
  return knightMoves(size)[from].includes(to);
}

/** Squares the knight can move to next: a jump away and not visited yet. */
export function legalMoves(path: readonly number[], size: number): number[] {
  if (path.length === 0) return [];
  const seen = new Set(path);
  return knightMoves(size)[path[path.length - 1]].filter((sq) => !seen.has(sq));
}

/** A tour is closed when the last square is one knight's move from the first. */
export function isClosedTour(path: readonly number[], size: number): boolean {
  return path.length === size * size && isKnightMove(path[path.length - 1], path[0], size);
}

/** Chess-style name for screen readers: columns a–h, rows counted from the bottom. */
export function squareName(sq: number, size: number): string {
  const row = Math.floor(sq / size);
  const col = sq % size;
  return `${String.fromCharCode(97 + col)}${size - row}`;
}
