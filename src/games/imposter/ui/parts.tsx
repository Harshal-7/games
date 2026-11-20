"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";

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

/** The three lines on a face-up card. */
type FaceText = { kicker: string; word: string; note: string };

export function wordFace(round: Round): FaceText {
  return { kicker: "The word is", word: round.word, note: category(round.category).label };
}

export function imposterFace(round: Round, clue: Clue): FaceText {
  const note =
    clue === "hint"
      ? `Hint: ${round.hint}`
      : clue === "category"
        ? `Category: ${category(round.category).label}`
        : "No hint. Blend in.";
  return { kicker: "You're the", word: "Imposter", note };
}

/** A face-up card's lines; the card around them is styled by its class (.imp-face). */
export function Face({ kicker, word, note }: FaceText) {
  return (
    <>
      <span className="imp-face-kicker">{kicker}</span>
      <span className="imp-face-word">{word}</span>
      <span className="imp-face-note">{note}</span>
    </>
  );
}

/**
 * What a player's card says. The word and the imposter card share one layout and one
 * look, so nobody across the table can tell them apart from a glance at the card.
 */
export function SecretFace({ round, id, clue }: { round: Round; id: string; clue: Clue }) {
  return <Face {...(round.imposters.includes(id) ? imposterFace(round, clue) : wordFace(round))} />;
}

/** "Round 3" on the left, where the round is on the right. */
export function PlayHead({ round, label }: { round: number; label: string }) {
  return (
    <div className="imp-play-head">
      <span className="imp-round">Round {round}</span>
      <span className="imp-play-label">{label}</span>
    </div>
  );
}

/** A name in big type. Long names step down a size so they fit a phone. */
export function BigName({ name }: { name: string }) {
  return <h2 className={name.length > 9 ? "imp-big-name is-long" : "imp-big-name"}>{name}</h2>;
}

/**
 * A rubber stamp ("Caught!") that drops in once. Next keeps visited pages in the
 * page and replays CSS animations when one shows again, so once the stamp has landed
 * it switches to a still class.
 */
export function Stamp({ children, className }: { children: ReactNode; className?: string }) {
  const [landed, setLanded] = useState(false);
  return (
    <span
      className={["imp-stamp", landed ? null : "is-dropping", className].filter(Boolean).join(" ")}
      onAnimationEnd={() => setLanded(true)}
    >
      {children}
    </span>
  );
}
