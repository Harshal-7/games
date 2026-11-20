"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

import { between } from "../logic/follow";
import type { Phase } from "../logic/game";
import { otherEnd, type Pattern, type Point } from "../logic/pattern";
import { penAt, route, type Trace } from "../logic/solver";
import { drawnOf } from "./drawn";

/** The box the pattern sits in: -50 to 50, with room round it for thick lines and the pen. */
const VIEW = 112;

/** Finger sizes in screen pixels: putting a finger on a dot, reaching a line's far dot, and how far off a line it may stray. */
const TOUCH_PX = 22;
const ARRIVE_PX = 14;
const STRAY_PX = 16;

type FloorProps = {
  pattern: Pattern;
  trace: Trace;
  phase: Phase;
  /** Watch it solve is drawing: no fingers, and each new line draws itself in. */
  solving: boolean;
  /** Dots that glow: the ones that can start it, after a wrong start or a hint. */
  glow: readonly number[];
  /** The line Hint shows, dashed. */
  hintLine: number | null;
  label: string;
  onStart: (dot: number) => void;
  onTrace: (line: number) => void;
  /** A finger went down on a dot that isn't where the pen is. */
  onMiss: () => void;
};

type Stroke = { pointerId: number; pen: number; points: Point[]; last: Point };

/**
 * The cream floor with the pattern on it. Lines left to draw are dotted chalk; a line
 * fills with its powder colour as the finger follows it from the pen and is drawn once
 * the finger reaches its far dot. Lifting the finger keeps every line drawn; putting
 * it back on the pen carries on. When the pattern is done its shapes fill in.
 */
export function Floor(props: FloorProps) {
  const { pattern, trace, phase, solving, glow, hintLine, label } = props;
  const drawn = drawnOf(pattern);
  const svg = useRef<SVGSVGElement>(null);
  const stroke = useRef<Stroke | null>(null);
  // The trace as the gesture sees it: lines drawn mid-gesture count before React redraws.
  const live = useRef<{ start: number | null; lines: number[] }>({ start: trace.start, lines: [...trace.lines] });
  const [following, setFollowing] = useState<{ line: number; t: number; backwards: boolean } | null>(null);
  // The newest line Watch it solve drew, until its draw-in animation ends.
  const [settled, setSettled] = useState(0);

  useEffect(() => {
    live.current = { start: trace.start, lines: [...trace.lines] };
  }, [trace]);

  const traced = new Set(trace.lines);
  const path = route(pattern, trace);
  const pen = path.length ? path[path.length - 1] : null;
  const done = phase === "done";
  const canDraw = !solving && phase !== "done" && phase !== "stuck";

  /** Pattern units per screen pixel. */
  function scale(): number {
    const box = svg.current?.getBoundingClientRect();
    return box && box.width > 0 ? VIEW / box.width : 1;
  }

  function toPattern(e: { clientX: number; clientY: number }): Point | null {
    const el = svg.current;
    const matrix = el?.getScreenCTM();
    if (!el || !matrix) return null;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(matrix.inverse());
    return [p.x, p.y];
  }

  function openLines(at: number): number[] {
    const used = new Set(live.current.lines);
    return pattern.lines.flatMap((line, i) => (!used.has(i) && (line.a === at || line.b === at) ? [i] : []));
  }

  function onPointerDown(e: ReactPointerEvent<SVGSVGElement>) {
    if (!canDraw || (e.pointerType === "mouse" && e.button !== 0)) return;
    const p = toPattern(e);
    if (!p) return;
    const touch = TOUCH_PX * scale();
    const { start, lines } = live.current;
    let from: number | null = null;
    if (lines.length === 0) {
      // Before the first line any dot can start it (picking another moves the start).
      from = drawn.tracks.dotAt(p, touch);
      if (from !== null && from !== start) {
        props.onStart(from);
        live.current = { start: from, lines: [] };
      }
    } else {
      const at = penAt(pattern, live.current);
      if (at !== null && Math.hypot(pattern.dots[at][0] - p[0], pattern.dots[at][1] - p[1]) <= touch) from = at;
      else if (drawn.tracks.dotAt(p, touch) !== null) props.onMiss();
    }
    if (from === null) return;
    e.preventDefault();
    try {
      // Keeps the stroke when the finger strays off the floor.
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // A pointer the browser no longer tracks: the stroke still works while it's over the floor.
    }
    stroke.current = { pointerId: e.pointerId, pen: from, points: [p], last: p };
  }

  function onPointerMove(e: ReactPointerEvent<SVGSVGElement>) {
    const s = stroke.current;
    if (!s || s.pointerId !== e.pointerId) return;
    const units = scale();
    const arrive = ARRIVE_PX * units;
    const stray = STRAY_PX * units;
    const events = e.nativeEvent.getCoalescedEvents?.() ?? [];
    for (const event of events.length ? events : [e.nativeEvent]) {
      const p = toPattern(event);
      if (!p) continue;
      for (const point of between(s.last, p, 1.5)) {
        s.points.push(point);
        s.last = point;
        const open = openLines(s.pen);
        // Only ask which line was drawn once the finger is at the far dot of one.
        const near = open.some((i) => {
          const far = pattern.dots[otherEnd(pattern.lines[i], s.pen)];
          return Math.hypot(far[0] - point[0], far[1] - point[1]) <= arrive;
        });
        const line = near ? drawn.tracks.arrived(s.pen, open, s.points, arrive, stray) : null;
        if (line === null) continue;
        props.onTrace(line);
        live.current = { start: live.current.start, lines: [...live.current.lines, line] };
        s.pen = otherEnd(pattern.lines[line], s.pen);
        s.points = [point];
      }
    }
    const at = drawn.tracks.following(s.pen, openLines(s.pen), s.points, stray);
    setFollowing(at && { line: at.line, t: at.t, backwards: pattern.lines[at.line].a !== s.pen });
  }

  function onPointerEnd(e: ReactPointerEvent<SVGSVGElement>) {
    if (stroke.current?.pointerId !== e.pointerId) return;
    stroke.current = null;
    setFollowing(null);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Already released.
    }
  }

  const newest = solving && trace.lines.length > settled ? trace.lines[trace.lines.length - 1] : null;
  const glowing = new Set(glow);

  return (
    <div className="rg-floor" data-phase={phase}>
      <svg
        ref={svg}
        className="rg-floor-svg"
        viewBox={`${-VIEW / 2} ${-VIEW / 2} ${VIEW} ${VIEW}`}
        role="img"
        aria-label={label}
        data-drawing={canDraw ? "" : undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
      >
        <g className="rg-faces">
          {drawn.faces.map((face, i) => (
            <path key={i} d={face.path} className={`rg-face rg-t${face.tone}`} />
          ))}
        </g>
        <g className="rg-guides">
          {pattern.lines.map((_, i) => (traced.has(i) ? null : <path key={i} d={drawn.forwards[i]} className="rg-guide" />))}
        </g>
        <g className="rg-lines">
          {trace.lines.map((i, k) => {
            const backwards = pattern.lines[i].a !== path[k];
            return (
              <path
                key={i}
                d={backwards ? drawn.backwards[i] : drawn.forwards[i]}
                pathLength={1}
                className={`rg-line rg-t${pattern.lines[i].tone}${i === newest ? " is-new" : ""}`}
                onAnimationEnd={i === newest ? () => setSettled(trace.lines.length) : undefined}
              />
            );
          })}
          {following && !traced.has(following.line) && (
            <path
              d={following.backwards ? drawn.backwards[following.line] : drawn.forwards[following.line]}
              pathLength={1}
              strokeDasharray={`${following.t} 1`}
              className={`rg-line rg-t${pattern.lines[following.line].tone}`}
            />
          )}
        </g>
        {hintLine !== null && !traced.has(hintLine) && pen !== null && (
          <g className="rg-hint">
            <path d={drawn.forwards[hintLine]} />
            <circle
              cx={pattern.dots[otherEnd(pattern.lines[hintLine], pen)][0]}
              cy={pattern.dots[otherEnd(pattern.lines[hintLine], pen)][1]}
              r={3.6}
            />
          </g>
        )}
        {[...glowing].map((dot) => (
          <circle key={dot} cx={pattern.dots[dot][0]} cy={pattern.dots[dot][1]} r={4.4} className="rg-glow" />
        ))}
        <g className="rg-dots">
          {pattern.dots.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={done ? 1.5 : 1.25} />
          ))}
        </g>
        {pen !== null && !done && (
          <circle cx={pattern.dots[pen][0]} cy={pattern.dots[pen][1]} r={3} className="rg-pen" />
        )}
      </svg>
    </div>
  );
}
