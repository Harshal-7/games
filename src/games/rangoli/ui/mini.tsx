import type { Pattern } from "../logic/pattern";
import { drawnOf } from "./drawn";

/**
 * A small drawing of a pattern, for the list's tiles: thin muted lines while it's still
 * to draw, the finished look (colour lines, filled shapes, cream dots) once drawn.
 */
export function MiniPattern({ pattern, coloured, className }: { pattern: Pattern; coloured: boolean; className?: string }) {
  const drawn = drawnOf(pattern);
  return (
    <svg viewBox="-56 -56 112 112" className={`rg-mini${coloured ? " is-coloured" : ""} ${className ?? ""}`} aria-hidden="true" focusable="false">
      {coloured && drawn.faces.map((face, i) => <path key={i} d={face.path} className={`rg-face rg-t${face.tone}`} />)}
      {pattern.lines.map((line, i) => (
        <path key={i} d={drawn.forwards[i]} className={coloured ? `rg-mini-line rg-t${line.tone}` : "rg-mini-line"} />
      ))}
      {pattern.dots.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={2} className="rg-mini-dot" />
      ))}
    </svg>
  );
}
