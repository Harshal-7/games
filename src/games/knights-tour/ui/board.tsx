"use client";

import { useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";

import { legalMoves, squareName, type Size } from "../logic/board";
import type { Phase } from "../logic/game";
import { SKINS, type SkinId } from "../skins";

type BoardProps = {
  size: Size;
  path: readonly number[];
  phase: Phase;
  hint: number | null;
  closed: boolean;
  /** Squares can't be pressed (Watch it solve is playing). */
  locked: boolean;
  /** How long the knight takes to slide to the next square. */
  moveMs: number;
  onSquare: (square: number) => void;
  skin?: SkinId;
};

export function Board({ size, path, phase, hint, closed, locked, moveMs, onSquare, skin = "classic" }: BoardProps) {
  const n = size * size;
  const { Piece } = SKINS[skin];
  const knight = path.length > 0 ? path[path.length - 1] : null;
  const legal = useMemo(() => new Set(legalMoves(path, size)), [path, size]);
  const moveNumber = useMemo(() => new Map(path.map((sq, i) => [sq, i + 1])), [path]);

  // Arrow keys move focus around the board; only one square is in the Tab order.
  const [focused, setFocused] = useState(0);
  const focusIndex = Math.min(focused, n - 1);
  const cells = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(e: KeyboardEvent) {
    const row = Math.floor(focusIndex / size);
    const col = focusIndex % size;
    const target =
      e.key === "ArrowUp" && row > 0
        ? focusIndex - size
        : e.key === "ArrowDown" && row < size - 1
          ? focusIndex + size
          : e.key === "ArrowLeft" && col > 0
            ? focusIndex - 1
            : e.key === "ArrowRight" && col < size - 1
              ? focusIndex + 1
              : e.key === "Home"
                ? row * size
                : e.key === "End"
                  ? row * size + size - 1
                  : null;
    if (target === null) return;
    e.preventDefault();
    setFocused(target);
    cells.current[target]?.focus();
  }

  const canPress = (sq: number) =>
    !locked && (phase === "start" || (phase === "playing" && legal.has(sq)));

  function label(sq: number): string {
    const name = squareName(sq, size);
    const move = moveNumber.get(sq);
    if (sq === knight) return `${name}, knight, move ${move}`;
    if (move) return `${name}, move ${move}`;
    if (phase === "start") return `Place the knight on ${name}`;
    if (legal.has(sq)) return `Jump to ${name}${sq === hint ? " (hint)" : ""}`;
    return name;
  }

  const centre = (sq: number) => [(sq % size) + 0.5, Math.floor(sq / size) + 0.5] as const;
  const [endX, endY] = knight !== null ? centre(knight) : [0, 0];
  const [startX, startY] = path.length > 0 ? centre(path[0]) : [0, 0];
  const style = { "--n": size, "--move": `${moveMs}ms` } as CSSProperties;

  return (
    <div
      className="kt-board"
      data-skin={skin}
      data-phase={phase}
      data-locked={locked || undefined}
      style={style}
      role="group"
      aria-label={`Board, ${size} by ${size}`}
    >
      <div className="kt-squares" aria-hidden="true">
        {Array.from({ length: n }, (_, sq) => (
          <div
            key={sq}
            className={[
              "kt-sq",
              (Math.floor(sq / size) + (sq % size)) % 2 ? "is-dark" : "is-light",
              moveNumber.has(sq) && "is-visited",
              sq === knight && "is-current",
            ]
              .filter(Boolean)
              .join(" ")}
          />
        ))}
      </div>

      <svg className="kt-trail" viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        {path.length > 1 && <polyline points={path.map((sq) => centre(sq).join(",")).join(" ")} />}
        {closed && <line className="kt-closing" x1={endX} y1={endY} x2={startX} y2={startY} />}
      </svg>

      <div className="kt-cells" onKeyDown={onKeyDown}>
        {Array.from({ length: n }, (_, sq) => {
          const move = moveNumber.get(sq);
          const pressable = canPress(sq);
          return (
            <button
              key={sq}
              ref={(el) => {
                cells.current[sq] = el;
              }}
              type="button"
              className={[
                "kt-cell",
                pressable && "is-pressable",
                legal.has(sq) && phase === "playing" && "is-legal",
                sq === hint && "is-hint",
              ]
                .filter(Boolean)
                .join(" ")}
              tabIndex={sq === focusIndex ? 0 : -1}
              aria-label={label(sq)}
              aria-disabled={!pressable}
              onFocus={() => setFocused(sq)}
              onClick={() => pressable && onSquare(sq)}
            >
              {move && sq !== knight ? (
                <span className={move === 1 ? "kt-node is-first" : "kt-node"}>{move}</span>
              ) : null}
              {legal.has(sq) && phase === "playing" ? <span className="kt-dot" /> : null}
            </button>
          );
        })}
      </div>

      {knight !== null && (
        <div
          className="kt-knight"
          style={{ transform: `translate(${(knight % size) * 100}%, ${Math.floor(knight / size) * 100}%)` }}
          aria-hidden="true"
        >
          <Piece className="kt-piece" />
        </div>
      )}
    </div>
  );
}
