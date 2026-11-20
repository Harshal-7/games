"use client";

import { useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";

import { BOARDS, jumpsFrom, type BoardId } from "../logic/boards";
import { drawingOf } from "../logic/drawing";
import type { Hint, Move } from "../logic/game";

type BoardProps = {
  boardId: BoardId;
  marbles: readonly boolean[];
  /** The jumps played: a jump added at the end hops, anything else just redraws. */
  moves: readonly Move[];
  /** The lifted marble, if any. */
  picked: number | null;
  hint: Hint | null;
  /** No taps (Watch it solve is playing, or the game is over). */
  locked: boolean;
  /** How long a hop takes. */
  hopMs: number;
  onPick: (hole: number | null) => void;
  onJump: (from: number, to: number) => void;
};

/**
 * A press on the board: where it started, whether it lifted a marble as it went down
 * (then letting go is no second tap), and whether it turned into a drag.
 */
type Press = { id: number; hole: number; x: number; y: number; lifted: boolean; dragging: boolean };

/** Moving this far (px) turns a press into a drag. */
const DRAG_START = 8;

export function Board({ boardId, marbles, moves, picked, hint, locked, hopMs, onPick, onJump }: BoardProps) {
  const board = BOARDS[boardId];
  const drawing = useMemo(() => drawingOf(board), [board]);
  const from = useMemo(() => jumpsFrom(board), [board]);

  // The jump to animate: the one just added, until its hop ends.
  // A marble dropped by a drag is already over its hole, so it doesn't fly; the jumped
  // marble still pops off.
  const [seen, setSeen] = useState(moves);
  const [hop, setHop] = useState<(Move & { fly: boolean }) | null>(null);
  const [dropped, setDropped] = useState<Move | null>(null);
  if (seen !== moves) {
    const grew = moves.length === seen.length + 1 && (seen.length === 0 || moves[seen.length - 1] === seen[seen.length - 1]);
    const last = moves[moves.length - 1];
    setSeen(moves);
    setHop(grew ? { ...last, fly: !(dropped && dropped.from === last.from && dropped.to === last.to) } : null);
    setDropped(null);
  }
  const hopping = hop ? board.jumps.find((j) => j.from === hop.from && j.to === hop.to) : undefined;
  const flying = hopping && hop?.fly ? hopping : undefined;

  const landings = useMemo(() => {
    if (picked === null || !marbles[picked]) return new Set<number>();
    return new Set(from[picked].filter((j) => marbles[j.over] && !marbles[j.to]).map((j) => j.to));
  }, [from, marbles, picked]);
  const canMove = (hole: number) => marbles[hole] && from[hole].some((j) => marbles[j.over] && !marbles[j.to]);

  // ---------- Taps and drags ----------

  const root = useRef<HTMLDivElement>(null);
  const [press, setPress] = useState<Press | null>(null);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);

  /** A tap on a hole, or a drag that ended on one. */
  function choose(hole: number, dragFrom: number | null) {
    if (locked) return;
    if (dragFrom !== null) {
      if (dragFrom !== hole && marbles[dragFrom] && landingsOf(dragFrom).has(hole)) {
        setDropped({ from: dragFrom, to: hole });
        onJump(dragFrom, hole);
      }
      return;
    }
    if (marbles[hole]) onPick(picked === hole ? null : hole);
    else if (picked !== null && landings.has(hole)) onJump(picked, hole);
    else onPick(null);
  }

  function landingsOf(hole: number): Set<number> {
    return new Set(from[hole].filter((j) => marbles[j.over] && !marbles[j.to]).map((j) => j.to));
  }

  /** The hole under a point on the screen, if it's close enough to one. */
  function holeAt(clientX: number, clientY: number): number | null {
    const box = root.current?.getBoundingClientRect();
    if (!box) return null;
    const x = drawing.minX + ((clientX - box.left) / box.width) * drawing.spanX;
    const y = drawing.minY + ((clientY - box.top) / box.height) * drawing.spanY;
    let best: number | null = null;
    let bestDistance = 0.6;
    for (const [h, hole] of board.holes.entries()) {
      const d = Math.hypot(hole.x - x, hole.y - y);
      if (d < bestDistance) {
        best = h;
        bestDistance = d;
      }
    }
    return best;
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (locked || e.button !== 0 || press) return;
    const hole = holeAt(e.clientX, e.clientY);
    if (hole === null) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    // Lift a marble that can move straight away, so a drag starts from a lifted marble.
    const lifted = canMove(hole) && picked !== hole;
    setPress({ id: e.pointerId, hole, x: e.clientX, y: e.clientY, lifted, dragging: false });
    if (lifted) onPick(hole);
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!press || e.pointerId !== press.id || !marbles[press.hole]) return;
    const dx = e.clientX - press.x;
    const dy = e.clientY - press.y;
    if (!press.dragging && Math.hypot(dx, dy) < DRAG_START) return;
    if (!press.dragging) setPress({ ...press, dragging: true });
    setDrag({ x: dx, y: dy });
  }

  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    if (!press || e.pointerId !== press.id) return;
    setPress(null);
    setDrag(null);
    if (press.dragging) {
      const hole = holeAt(e.clientX, e.clientY);
      if (hole !== null) choose(hole, press.hole);
    } else if (!press.lifted) {
      choose(press.hole, null);
    }
  }

  function onPointerCancel() {
    setPress(null);
    setDrag(null);
  }

  // ---------- Keyboard: arrows move between holes, Enter or Space taps ----------

  const cells = useRef<(HTMLButtonElement | null)[]>([]);
  const [focused, setFocused] = useState(board.start);
  const focusIndex = Math.min(focused, board.holes.length - 1);

  function onKeyDown(e: KeyboardEvent) {
    const step = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[e.key];
    if (e.key === "Escape" && picked !== null) {
      e.preventDefault();
      onPick(null);
      return;
    }
    if (!step) return;
    e.preventDefault();
    const here = board.holes[focusIndex];
    let best = -1;
    let bestScore = Infinity;
    for (const [h, hole] of board.holes.entries()) {
      const dx = hole.x - here.x;
      const dy = hole.y - here.y;
      const along = dx * step[0] + dy * step[1];
      if (along <= 0.1) continue;
      const across = Math.abs(dx * step[1] - dy * step[0]);
      const score = along + across * 2;
      if (score < bestScore) {
        best = h;
        bestScore = score;
      }
    }
    if (best < 0) return;
    setFocused(best);
    cells.current[best]?.focus();
  }

  function label(hole: number): string {
    const { row, col } = board.holes[hole];
    const inRow = board.holes.filter((h) => h.row === row);
    const name = `Row ${row + 1}, hole ${inRow.findIndex((h) => h.col === col) + 1}`;
    const goal = hole === board.goal ? ", the goal hole" : "";
    if (marbles[hole]) {
      const isHint = hint !== null && hint !== "back" && hint.from === hole;
      return `${name}${goal}, marble${hole === picked ? ", picked" : ""}${isHint ? " (hint)" : ""}`;
    }
    if (landings.has(hole)) return `${name}${goal}, jump here`;
    return `${name}${goal}, empty`;
  }

  const style = { aspectRatio: `${drawing.spanX} / ${drawing.spanY}`, "--hop": `${hopMs}ms` } as CSSProperties;
  const cellStyle = (hole: number) => ({
    left: `${drawing.cells[hole].left}%`,
    top: `${drawing.cells[hole].top}%`,
    width: `${drawing.cellWidth}%`,
    height: `${drawing.cellHeight}%`,
  });
  const hintMove = hint !== null && hint !== "back" ? hint : null;

  return (
    <div
      ref={root}
      className="ms-board"
      data-board={boardId}
      data-kt-board="wood"
      data-locked={locked || undefined}
      data-dragging={press?.dragging || undefined}
      style={style}
      role="group"
      aria-label={`${board.name} board, ${marbles.filter(Boolean).length} marbles`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onLostPointerCapture={onPointerCancel}
      onKeyDown={onKeyDown}
    >
      <svg
        className="ms-wood"
        viewBox={`${drawing.minX} ${drawing.minY} ${drawing.spanX} ${drawing.spanY}`}
        aria-hidden="true"
      >
        <path className="ms-rim" d={drawing.rim} />
        <path className="ms-slab" d={drawing.slab} />
      </svg>

      {board.holes.map((_, hole) => {
        const marble = marbles[hole];
        const landing = flying?.to === hole;
        const dragged = drag !== null && press?.hole === hole;
        return (
          <button
            key={hole}
            ref={(el) => {
              cells.current[hole] = el;
            }}
            type="button"
            className={["ms-cell", (canMove(hole) || landings.has(hole)) && !locked && "is-pressable"].filter(Boolean).join(" ")}
            style={cellStyle(hole)}
            tabIndex={hole === focusIndex ? 0 : -1}
            aria-label={label(hole)}
            aria-disabled={locked || undefined}
            onFocus={() => setFocused(hole)}
            onClick={(e) => {
              // Pointers are handled above; this is Enter or Space.
              if (e.detail === 0) choose(hole, null);
            }}
          >
            <span className="ms-hole" />
            {hole === board.goal && <span className="ms-goal" />}
            {(landings.has(hole) || hintMove?.to === hole) && !marble && (
              <span className={hintMove?.to === hole ? "ms-ring is-hint" : "ms-ring"} />
            )}
            {hintMove?.from === hole && marble && <span className="ms-ring is-hint is-around" />}
            {marble && (
              <span
                className={[
                  "ms-marble",
                  hole === picked && "is-picked",
                  dragged && "is-dragged",
                  landing && "is-landing",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={dragged ? ({ "--drag-x": `${drag.x}px`, "--drag-y": `${drag.y}px` } as CSSProperties) : undefined}
              />
            )}
            {hopping?.over === hole && !marble && (
              <span className="ms-marble is-popping" onAnimationEnd={() => !flying && setHop(null)} />
            )}
          </button>
        );
      })}

      {flying && (
        <span
          key={`${flying.from}-${flying.to}-${moves.length}`}
          className="ms-flyer"
          style={
            {
              ...cellStyle(flying.from),
              "--dx": board.holes[flying.to].x - board.holes[flying.from].x,
              "--dy": board.holes[flying.to].y - board.holes[flying.from].y,
            } as CSSProperties
          }
          onAnimationEnd={() => setHop(null)}
          aria-hidden="true"
        >
          <span className="ms-marble" />
        </span>
      )}
    </div>
  );
}
