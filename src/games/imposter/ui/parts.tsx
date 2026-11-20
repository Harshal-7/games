"use client";

import { useSyncExternalStore } from "react";

import type { Clue, Room, Round } from "../logic/room";
import { category } from "../logic/words";

/** id → name for everyone in the room. */
export function namesOf(room: Room): Record<string, string> {
  return Object.fromEntries(room.players.map((p) => [p.id, p.name]));
}

/** "Riya", "Riya and Aman", "Riya, Aman and Dev". */
export function listNames(names: readonly string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

const noop = () => () => {};

/** False on the server and during hydration, true after: the room is only known in the browser. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}

/**
 * What a card says. The word and the imposter card share one layout and one look,
 * so nobody across the table can tell them apart from a glance at the colours.
 */
export function SecretFace({ round, id, clue }: { round: Round; id: string; clue: Clue }) {
  const label = category(round.category).label;
  if (!round.imposters.includes(id)) {
    return (
      <>
        <span className="imp-face-kicker">The word is</span>
        <span className="imp-face-word">{round.word}</span>
        <span className="imp-face-note">{label}</span>
      </>
    );
  }
  return (
    <>
      <span className="imp-face-kicker">You&apos;re the</span>
      <span className="imp-face-word">Imposter</span>
      <span className="imp-face-note">
        {clue === "hint" ? (
          <>
            Hint: <b>{round.hint}</b>
          </>
        ) : clue === "category" ? (
          <>
            Category: <b>{label}</b>
          </>
        ) : (
          "No hint. Blend in."
        )}
      </span>
    </>
  );
}

/** The word, its category, the imposters and their hint, shown at the end of a round. */
export function Answer({ round, names }: { round: Round; names: Record<string, string> }) {
  const imposters = round.imposters.map((id) => names[id]);
  return (
    <dl className="imp-answer">
      <div>
        <dt>The word</dt>
        <dd className="imp-answer-word">{round.word}</dd>
        <dd className="imp-answer-category">{category(round.category).label}</dd>
      </div>
      <div>
        <dt>{imposters.length === 1 ? "Imposter" : "Imposters"}</dt>
        <dd>{listNames(imposters)}</dd>
      </div>
      <div>
        <dt>Their hint</dt>
        <dd>{round.hint}</dd>
      </div>
    </dl>
  );
}
