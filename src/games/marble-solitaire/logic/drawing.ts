import type { Board } from "./boards";

/**
 * Where everything goes when a board is drawn. Units are hole spacings, the same across
 * and down, so the drawing keeps its shape at any size. The wooden board follows the
 * holes: a cross, the European board's stepped octagon, or a triangle.
 */
export type Drawing = {
  /** The drawing's box, for the SVG viewBox and the board's aspect ratio. */
  minX: number;
  minY: number;
  spanX: number;
  spanY: number;
  /** The dark rim and the lighter wood inside it (drawn with round joins). */
  rim: string;
  slab: string;
  /** Each hole's square, in % of the board: left, top. */
  cells: readonly { left: number; top: number }[];
  /** A hole's square, in % of the board's width and height. */
  cellWidth: number;
  cellHeight: number;
};

const poly = (points: readonly (readonly [number, number])[]) =>
  `M${points.map(([x, y]) => `${+x.toFixed(3)} ${+y.toFixed(3)}`).join("L")}Z`;

/** The cross (and with `corners`, the European board) grown by `m` around its holes. */
function cross(m: number, corners: boolean): string {
  const a = -m;
  const b = 2 - m;
  const d = 4 + m;
  const e = 6 + m;
  const f = 1 - m;
  const g = 5 + m;
  return corners
    ? poly([[b, a], [d, a], [d, f], [g, f], [g, b], [e, b], [e, d], [g, d], [g, g], [d, g], [d, e], [b, e], [b, g], [f, g], [f, d], [a, d], [a, b], [f, b], [f, f], [b, f]])
    : poly([[b, a], [d, a], [d, b], [e, b], [e, d], [d, d], [d, e], [b, e], [b, d], [a, d], [a, b], [b, b]]);
}

/** The triangle grown by `m` around its corner holes. */
function triangle(m: number, size: number): string {
  const h = Math.sqrt(3) / 2;
  const n = size - 1;
  const corners: [number, number][] = [
    [n / 2, 0],
    [0, n * h],
    [n, n * h],
  ];
  const cx = n / 2;
  const cy = (n * h * 2) / 3;
  return poly(
    corners.map(([x, y]) => {
      const len = Math.hypot(x - cx, y - cy);
      return [x + ((x - cx) / len) * 2 * m, y + ((y - cy) / len) * 2 * m] as const;
    }),
  );
}

export function drawingOf(board: Board): Drawing {
  const isTriangle = board.id === "triangle";
  const h = Math.sqrt(3) / 2;
  const [minX, minY, spanX, spanY] = isTriangle ? [-1.25, -1.4, 6.5, 4 * h + 2.4] : [-0.72, -0.72, 7.44, 7.44];
  const rim = isTriangle ? triangle(0.62, 5) : cross(0.5, board.id === "european");
  const slab = isTriangle ? triangle(0.5, 5) : cross(0.4, board.id === "european");
  return {
    minX,
    minY,
    spanX,
    spanY,
    rim,
    slab,
    cells: board.holes.map(({ x, y }) => ({
      left: ((x - 0.5 - minX) / spanX) * 100,
      top: ((y - 0.5 - minY) / spanY) * 100,
    })),
    cellWidth: 100 / spanX,
    cellHeight: 100 / spanY,
  };
}
