"use client";

import { Face, type FaceText } from "@/party/ui/hold-card";

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

/**
 * What a player's card says. The word and the imposter card share one layout and one
 * look, so nobody across the table can tell them apart from a glance at the card.
 */
export function SecretFace({ round, id, clue }: { round: Round; id: string; clue: Clue }) {
  return <Face {...(round.imposters.includes(id) ? imposterFace(round, clue) : wordFace(round))} />;
}
