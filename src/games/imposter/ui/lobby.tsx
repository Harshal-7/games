"use client";

import { useId, useState, type FormEvent, type ReactNode } from "react";

import { Confirm } from "@/ui/confirm";
import { CloseIcon, MinusIcon, PlusIcon, RestartIcon } from "@/ui/icons";

import { cryptoRandom, randomId } from "../logic/random";
import {
  cleanName,
  imposterCount,
  MAX_NAME,
  MAX_PLAYERS,
  maxImposters,
  MIN_PLAYERS,
  nameProblem,
  QUICK_PLAYERS,
  startProblem,
  type Clue,
  type Player,
  type Room,
} from "../logic/room";
import { CATEGORIES, CATEGORY_IDS } from "../logic/words";
import { ChevronDownIcon, DealIcon } from "./marks";
import { act } from "./use-room";

const CLUE_LABELS: Record<Clue, { label: string; note: string }> = {
  hint: { label: "Hint", note: "The imposter sees a one-word hint." },
  category: { label: "Category", note: "The imposter sees the category only." },
  none: { label: "Nothing", note: "The imposter sees nothing. Hard mode." },
};

/** Players, round options and scores: the screen between rounds. */
export function Lobby({ room }: { room: Room }) {
  const problem = startProblem(room);
  const [ask, setAsk] = useState<"new-room" | "reset" | null>(null);
  const count = room.players.length;

  return (
    <div className="imp-lobby">
      <header className="imp-intro">
        <div className="imp-title-card">
          <span className="imp-title-mark" aria-hidden="true">
            ?
          </span>
          <span className="imp-title-mark is-turned" aria-hidden="true">
            ?
          </span>
          <div className="imp-title-plate">
            <h1 className="imp-title-name">Imposter</h1>
            <span className="imp-title-meta">
              {MIN_PLAYERS}–{MAX_PLAYERS} players · one phone
            </span>
          </div>
        </div>
        <p className="game-blurb imp-blurb">
          One phone, one secret word. Everyone gets it except the imposter, who has to fake it.
        </p>
      </header>

      <section className="card section imp-players" aria-labelledby="imp-players-title">
        <h2 className="tape" id="imp-players-title">
          Players <span className="tape-count">· {room.players.length}</span>
        </h2>
        {/* After a round: a new room keeps the players. Before one: Reset clears them, back
            to Quick start and the name field. */}
        {room.played > 0 ? (
          <button type="button" className="btn imp-small imp-new-room" onClick={() => setAsk("new-room")}>
            <RestartIcon width={15} height={15} strokeWidth={2.6} />
            New room
          </button>
        ) : (
          count > 0 && (
            <button type="button" className="btn imp-small imp-new-room" onClick={() => setAsk("reset")}>
              <RestartIcon width={15} height={15} strokeWidth={2.6} />
              Reset
            </button>
          )
        )}
        {ask === "new-room" && (
          <Confirm
            title="Start a new room?"
            detail="Scores and the imposter count go back to zero. Players and options stay."
            yes="New room"
            onNo={() => setAsk(null)}
            onYes={() => {
              act({ type: "new-room" });
              setAsk(null);
            }}
          />
        )}
        {ask === "reset" && (
          <Confirm
            title="Start over?"
            detail={`Removes ${count === 1 ? "the player" : `all ${count} players`}, so you can quick start or add names again. Options stay.`}
            yes="Reset"
            onNo={() => setAsk(null)}
            onYes={() => {
              act({ type: "clear-room" });
              setAsk(null);
            }}
          />
        )}
        <Roster room={room} />
      </section>

      <Options room={room} />

      <details className="imp-rules">
        <summary className="btn">
          How to play
          <ChevronDownIcon className="imp-rules-chevron" />
        </summary>
        <div className="card imp-rules-body">
          <ol>
            <li>Add everyone, then pass the phone round. Each player holds their card to see it, alone.</li>
            <li>Everyone gets the same secret word, except the imposter.</li>
            <li>Go round the circle: one word each about the secret word. Not too obvious.</li>
            <li>Vote for who&apos;s faking it. A caught imposter gets one guess at the word to steal the round.</li>
          </ol>
          <p>
            Points: catching the imposter gives everyone else 1. An imposter who gets away gets 2, or 1 for guessing
            the word after being caught.
          </p>
          <p>
            Fair play: cards are sealed, and a card shows &ldquo;Opened&rdquo; once anyone has looked, so a peek at
            someone else&apos;s card is always noticed. Over a few rounds everyone gets a turn as the imposter.
          </p>
        </div>
      </details>

      {/* Stuck to the bottom on phones, on a solid tray, so it's always in reach. */}
      <div className="imp-start">
        {problem && <p className="imp-start-note">{problem}</p>}
        <button
          type="button"
          className="btn btn-primary btn-big"
          disabled={problem !== null}
          onClick={() => act({ type: "start", rng: cryptoRandom })}
        >
          {room.played > 0 ? `Deal round ${room.played + 1}` : "Deal the cards"}
          <DealIcon width={22} height={22} />
        </button>
      </div>
    </div>
  );
}

function Roster({ room }: { room: Room }) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();

  const add = (e: FormEvent) => {
    e.preventDefault();
    const problem = nameProblem(room.players, draft);
    if (problem) {
      setError(problem);
      return;
    }
    act({ type: "add-player", id: randomId(cryptoRandom), name: draft });
    setDraft("");
    setError(null);
  };

  return (
    <>
      {room.players.length > 0 ? (
        <ol className="imp-roster">
          {room.players.map((player, i) => (
            <li key={player.id} className="imp-seat-pill">
              <span className="imp-seat" aria-hidden="true">
                {i + 1}
              </span>
              <NameInput key={player.name} player={player} players={room.players} />
              {room.played > 0 && (
                <span className="imp-points" title="Points">
                  {room.scores[player.id] ?? 0}
                  <span className="imp-visually-hidden"> points</span>
                </span>
              )}
              <button
                type="button"
                className="imp-remove"
                aria-label={`Remove ${player.name}`}
                title="Remove"
                onClick={() => act({ type: "remove-player", id: player.id })}
              >
                <CloseIcon width={16} height={16} strokeWidth={2.6} />
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <>
          <QuickStart />
          <p className="imp-or">or add names, in the order you&apos;re sitting</p>
        </>
      )}
      <form className="imp-add" onSubmit={add}>
        <label htmlFor={inputId} className="imp-visually-hidden">
          New player&apos;s name
        </label>
        <input
          id={inputId}
          className="imp-input"
          value={draft}
          maxLength={MAX_NAME}
          placeholder="Add a player"
          autoComplete="off"
          autoCapitalize="words"
          enterKeyHint="done"
          aria-invalid={error !== null}
          aria-describedby={error ? `${inputId}-error` : undefined}
          onChange={(e) => {
            setDraft(e.target.value);
            setError(null);
          }}
        />
        <button type="submit" className="btn" disabled={!draft.trim()}>
          <PlusIcon width={16} height={16} strokeWidth={2.6} />
          Add
        </button>
      </form>
      {error && (
        <p className="imp-error" id={`${inputId}-error`} role="alert">
          {error}
        </p>
      )}
    </>
  );
}

/** No time for names: a number of players, called Player 1, Player 2, … */
function QuickStart() {
  const [count, setCount] = useState(QUICK_PLAYERS);
  return (
    <div>
      <p className="imp-quick-title">Quick start</p>
      <p className="imp-quick-note">Skip the names and play as Player 1, Player 2… Rename anyone later.</p>
      <div className="imp-quick-row">
        <div className="imp-stepper" role="group" aria-label="How many players">
          <button
            type="button"
            className="icon-btn"
            aria-label="One player fewer"
            disabled={count <= MIN_PLAYERS}
            onClick={() => setCount((n) => n - 1)}
          >
            <MinusIcon width={16} height={16} strokeWidth={2.6} />
          </button>
          <output aria-live="polite">{count}</output>
          <button
            type="button"
            className="icon-btn"
            aria-label="One player more"
            disabled={count >= MAX_PLAYERS}
            onClick={() => setCount((n) => n + 1)}
          >
            <PlusIcon width={16} height={16} strokeWidth={2.6} />
          </button>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => act({ type: "quick-players", count, rng: cryptoRandom })}
        >
          Add {count} players
        </button>
      </div>
    </div>
  );
}

/**
 * A player's name, editable in place and as wide as the name (the hidden copy in
 * data-value sizes the field). A name that's empty or taken goes back to what it was.
 */
function NameInput({ player, players }: { player: Player; players: Player[] }) {
  const [value, setValue] = useState(player.name);
  return (
    <span className="imp-name" data-value={value}>
      <input
        className="imp-name-input"
        value={value}
        size={1}
        maxLength={MAX_NAME}
        aria-label={`Name of player ${player.name}`}
        autoComplete="off"
        enterKeyHint="done"
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        onBlur={() => {
          const name = cleanName(value);
          if (name === player.name || nameProblem(players, value, player.id)) setValue(player.name);
          else act({ type: "rename-player", id: player.id, name });
        }}
      />
    </span>
  );
}

function Options({ room }: { room: Room }) {
  const { options, players } = room;
  const max = maxImposters(players.length);
  const imposters = imposterCount(room);
  const allOn = options.categories.length === CATEGORY_IDS.length;
  const set = (patch: Partial<Room["options"]>) => act({ type: "options", patch });

  return (
    <section className="card section imp-options" aria-labelledby="imp-options-title">
      <h2 className="tape is-game" id="imp-options-title">
        Options
      </h2>

      <Choice
        label="Imposters"
        narrow
        note={max < 3 ? `${max + 1} imposters need ${2 * max + 3} or more players.` : undefined}
      >
        {[1, 2, 3].map((n) => (
          <SegButton key={n} on={imposters === n} disabled={n > max} onClick={() => set({ imposters: n })}>
            {n}
          </SegButton>
        ))}
      </Choice>

      <Choice label="Imposter gets" note={CLUE_LABELS[options.clue].note}>
        {(Object.keys(CLUE_LABELS) as Clue[]).map((clue) => (
          <SegButton key={clue} on={options.clue === clue} onClick={() => set({ clue })}>
            {CLUE_LABELS[clue].label}
          </SegButton>
        ))}
      </Choice>

      <div className="imp-field">
        <div className="imp-field-head">
          <span className="field-label" id="imp-categories">
            Categories
            <span className="imp-cat-count">
              {options.categories.length} of {CATEGORY_IDS.length}
            </span>
          </span>
          <button
            type="button"
            className="btn imp-small"
            onClick={() => set({ categories: allOn ? [] : [...CATEGORY_IDS] })}
          >
            {allOn ? "Clear" : "Pick all"}
          </button>
        </div>
        <div className="imp-chips" role="group" aria-labelledby="imp-categories">
          {CATEGORIES.map(({ id, label, emoji, words }) => {
            const on = options.categories.includes(id);
            return (
              <button
                key={id}
                type="button"
                className="imp-chip"
                aria-pressed={on}
                title={`${words.length} words`}
                onClick={() =>
                  set({
                    categories: on
                      ? options.categories.filter((c) => c !== id)
                      : CATEGORY_IDS.filter((c) => c === id || options.categories.includes(c)),
                  })
                }
              >
                <span className="imp-chip-emoji" aria-hidden="true">
                  {emoji}
                </span>
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="switches imp-switches">
        <div className="switch-row">
          <span>
            <span className="switch-label" id="imp-sound-label">
              Sound and vibration
            </span>
            <span className="switch-detail" id="imp-sound-detail">
              A buzz when you open your card or time runs out, and a tick in the last 10 seconds
            </span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={options.sound}
            aria-labelledby="imp-sound-label"
            aria-describedby="imp-sound-detail"
            className="switch"
            onClick={() => set({ sound: !options.sound })}
          >
            <span />
          </button>
        </div>
      </div>
    </section>
  );
}

function Choice({
  label,
  note,
  narrow,
  children,
}: {
  label: string;
  note?: string;
  /** A short row of options (1, 2, 3) that doesn't need the full width. */
  narrow?: boolean;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <div className="imp-field">
      <span className="field-label" id={id}>
        {label}
      </span>
      <div className={narrow ? "seg is-narrow" : "seg"} role="radiogroup" aria-labelledby={id}>
        {children}
      </div>
      {note && <p className="imp-field-note">{note}</p>}
    </div>
  );
}

function SegButton({
  on,
  disabled,
  onClick,
  children,
}: {
  on: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button type="button" role="radio" aria-checked={on} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}
