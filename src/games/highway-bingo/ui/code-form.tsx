"use client";

import { useId, useState } from "react";

import { MinusIcon, PlusIcon } from "@/ui/icons";

import { MAX_SEAT, MIN_SEAT } from "../logic/card";
import { readCode } from "../logic/code";

const PROBLEMS = {
  empty: "Type the code from the phone that started the game.",
  shape: "A code is a word and two numbers, like CHAI-42.",
  unknown:
    "This phone doesn't know that word. Check the spelling. If it's right, the other phone has a newer version of the game: open it here once with signal to update.",
} as const;

/** Join a game, or check someone's card: a code and a seat number. */
export function CodeForm({
  purpose,
  onCancel,
  onDone,
}: {
  purpose: "join" | "check";
  onCancel: () => void;
  onDone: (code: string, seat: number) => void;
}) {
  const [typed, setTyped] = useState("");
  const [seat, setSeat] = useState(purpose === "join" ? 2 : 1);
  const [tried, setTried] = useState(false);
  const codeId = useId();
  const read = readCode(typed);
  // Say what's wrong once it looks finished (a word and two digits) or after a try.
  const finished = /\d{2}\s*$/.test(typed);
  const problem = !read.ok && (tried || finished || read.problem === "unknown") ? PROBLEMS[read.problem] : null;
  const join = purpose === "join";

  return (
    <form
      className="hb-form"
      onSubmit={(e) => {
        e.preventDefault();
        setTried(true);
        if (read.ok) onDone(read.code.text, seat);
      }}
    >
      <header className="hb-form-head">
        <h1 className="game-title hb-screen-title">{join ? "Join a game" : "Check a card"}</h1>
        <button type="button" className="btn hb-small" onClick={onCancel}>
          Cancel
        </button>
      </header>
      <p className="game-blurb hb-form-blurb">
        {join
          ? "Type the code on the phone that started the game, and your seat number."
          : "Open anyone's card from the code, to check a Bingo!"}
      </p>

      <section className="card section hb-form-card">
        <label className="field-label" htmlFor={codeId}>
          Code
        </label>
        <input
          id={codeId}
          className="hb-code-input"
          value={typed}
          // Shown in capitals by CSS; rewriting the value would make the caret jump while typing.
          onChange={(e) => setTyped(e.target.value)}
          placeholder="CHAI-42"
          autoCapitalize="characters"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="go"
          maxLength={14}
          aria-invalid={problem ? true : undefined}
          aria-describedby={`${codeId}-note`}
        />
        <p className={problem ? "hb-field-note is-problem" : "hb-field-note"} id={`${codeId}-note`} aria-live="polite">
          {problem ??
            (read.ok
              ? `${read.code.size}×${read.code.size} card${read.code.size === 5 ? " with a free middle" : ""}`
              : "A word and two numbers, like CHAI-42.")}
        </p>

        <SeatStepper value={seat} onChange={setSeat} label={join ? "Your seat" : "Their seat"} />
        <p className="hb-field-note">
          {join
            ? "Seat 1 is the phone that started. Everyone else takes 2, 3, 4… Two phones on the same seat get the same card."
            : "The seat is on their Bingo! screen, next to the code."}
        </p>
      </section>

      <button type="submit" className="btn btn-primary btn-big hb-form-go">
        {join ? "Show my card" : "Show the card"}
      </button>
    </form>
  );
}

/** A seat number with big − and + buttons. */
export function SeatStepper({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (seat: number) => void;
  label: string;
}) {
  const id = useId();
  return (
    <div className="hb-seat-field">
      <span className="field-label" id={id}>
        {label}
      </span>
      <div className="hb-stepper" role="group" aria-labelledby={id}>
        <button
          type="button"
          className="icon-btn hb-step"
          onClick={() => onChange(value - 1)}
          disabled={value <= MIN_SEAT}
          aria-label="One seat down"
        >
          <MinusIcon width={22} height={22} strokeWidth={2.6} />
        </button>
        <output className="hb-seat-num" aria-live="polite">
          {value}
        </output>
        <button
          type="button"
          className="icon-btn hb-step"
          onClick={() => onChange(value + 1)}
          disabled={value >= MAX_SEAT}
          aria-label="One seat up"
        >
          <PlusIcon width={22} height={22} strokeWidth={2.6} />
        </button>
      </div>
    </div>
  );
}
