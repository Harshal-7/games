"use client";

import { Face, type FaceText } from "@/party/ui/hold-card";

import { KIND_TEXT } from "../logic/questions";
import type { Clue, Room, Round, WordRound } from "../logic/room";
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

export function wordFace(round: WordRound): FaceText {
  return { kicker: "The word is", word: round.word, note: category(round.category).label };
}

export function imposterFace(round: WordRound, clue: Clue): FaceText {
  const note =
    clue === "hint"
      ? `Hint: ${round.hint}`
      : clue === "category"
        ? `Category: ${category(round.category).label}`
        : "No hint. Blend in.";
  return { kicker: "You're the", word: "Imposter", note };
}

/**
 * A card with a question on it: a face's three lines, with the question in a smaller
 * size than a word so a sentence fits. The crew's and the imposter's read exactly alike,
 * bar the question.
 */
export function QuestionFace({ kicker, question, note }: { kicker: string; question: string; note?: string }) {
  return (
    <>
      <span className="party-face-kicker">{kicker}</span>
      <span className="party-face-word imp-question">{question}</span>
      {note && <span className="party-face-note">{note}</span>}
    </>
  );
}

/**
 * What a player's card says. The word and the imposter card share one layout and one
 * look, so nobody across the table can tell them apart from a glance at the card.
 */
export function SecretFace({ round, id, clue }: { round: Round; id: string; clue: Clue }) {
  const imposter = round.imposters.includes(id);
  if (round.mode === "questions") {
    const { crew, odd, kind } = round.question;
    return <QuestionFace kicker="Your question" question={imposter ? odd : crew} note={KIND_TEXT[kind].note} />;
  }
  return <Face {...(imposter ? imposterFace(round, clue) : wordFace(round))} />;
}
