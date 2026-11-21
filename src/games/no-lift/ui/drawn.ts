import { facesOf, type Face } from "../logic/faces";
import { Tracks } from "../logic/follow";
import { linePath, shapesOf, type Pattern } from "../logic/pattern";

/** A pattern's SVG paths (each line both ways), the shapes that fill in, and its finger tracks, worked out once. */
export type Drawn = {
  readonly forwards: readonly string[];
  readonly backwards: readonly string[];
  readonly faces: readonly Face[];
  readonly tracks: Tracks;
};

const cache = new WeakMap<Pattern, Drawn>();

export function drawnOf(pattern: Pattern): Drawn {
  let drawn = cache.get(pattern);
  if (!drawn) {
    const shapes = shapesOf(pattern);
    drawn = {
      forwards: shapes.map((shape) => linePath(shape)),
      backwards: shapes.map((shape) => linePath(shape, true)),
      faces: facesOf(pattern),
      tracks: new Tracks(pattern),
    };
    cache.set(pattern, drawn);
  }
  return drawn;
}
