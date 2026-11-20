"use client";

import { useState, type ReactNode } from "react";

import { CheckIcon } from "@/ui/icons";

/**
 * Point on three: everyone points at once, then someone taps the `count` people with the
 * most fingers on them and Reveal hands their ids to `onVote`. Tapping one more than
 * `count` lets go of the oldest pick. Names only, never anything secret.
 */
export function Vote({
  title,
  people,
  count,
  onVote,
  children,
}: {
  title: string;
  /** Everyone who can be picked, in seating order. */
  people: readonly { id: string; name: string }[];
  count: number;
  onVote: (ids: string[]) => void;
  /** Other ways on, under the main button ("Keep talking"). */
  children?: ReactNode;
}) {
  const [picked, setPicked] = useState<string[]>([]);
  const toggle = (id: string) =>
    setPicked((now) => (now.includes(id) ? now.filter((p) => p !== id) : [...now, id].slice(-count)));

  return (
    <div className="party-stage is-left">
      <h2 className="party-title">{title}</h2>
      <p className="party-help">
        Count to three and everyone points at once. Tap the {count === 1 ? "player" : `${count} players`} with the
        most fingers on them.
      </p>
      <div className="party-picks" role="group" aria-label="Suspects">
        {people.map(({ id, name }) => {
          const on = picked.includes(id);
          return (
            <button key={id} type="button" className="btn party-pick" aria-pressed={on} onClick={() => toggle(id)}>
              {on && <CheckIcon width={18} height={18} strokeWidth={3} />}
              <span>{name}</span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        className="btn btn-primary btn-big party-vote-go"
        disabled={picked.length !== count}
        onClick={() => onVote(picked)}
      >
        {picked.length === count ? "Reveal" : count === 1 ? "Pick a player" : `Pick ${count - picked.length} more`}
      </button>
      {children}
    </div>
  );
}
