"use client";

import { useId, useState, type FormEvent, type ReactNode } from "react";

import { CloseIcon, MinusIcon, PlusIcon } from "@/ui/icons";

import { cryptoRandom, randomId } from "../logic/random";
import {
  imposterCount,
  MAX_NAME,
  MAX_PLAYERS,
  maxImposters,
  MIN_PLAYERS,
  nameProblem,
  QUICK_PLAYERS,
  startProblem,
  TIMERS,
  type Clue,
  type Player,
  type Room,
} from "../logic/room";
import { CATEGORIES, CATEGORY_IDS } from "../logic/words";
import { Confirm } from "./parts";
import { act } from "./use-room";

const CLUE_LABELS: Record<Clue, { label: string; note: string }> = {
  hint: { label: "Hint", note: "The imposter sees a one-word hint." },
  category: { label: "Category", note: "The imposter sees the category only." },
  none: { label: "Nothing", note: "The imposter sees nothing. Hard mode." },
};

/** Players, round options and scores: the screen between rounds. */
export function Lobby({ room }: { room: Room }) {
  const problem = startProblem(room);
  const [resetting, setResetting] = useState(false);

  return (
    <div className="imp-lobby">
      <header className="imp-intro">
        <h1 className="game-title">Imposter</h1>
        <p className="game-blurb">
          One phone, one secret word. Everyone gets it except the imposter, who has to fake it.
        </p>
      </header>

      <section className="imp-panel imp-players" aria-labelledby="imp-players-title">
        <div className="imp-panel-head">
          <h2 id="imp-players-title">
            Players <span className="imp-count">{room.players.length}</span>
          </h2>
          {room.played > 0 && (
            <button type="button" className="btn btn-quiet imp-small" onClick={() => setResetting(true)}>
              New room
            </button>
          )}
        </div>
        {resetting && (
          <Confirm
            title="Start a new room?"
            detail="Scores and the imposter count go back to zero. Players and options stay."
            yes="New room"
            onNo={() => setResetting(false)}
            onYes={() => {
              act({ type: "new-room" });
              setResetting(false);
            }}
          />
        )}
        <Roster room={room} />
      </section>

      <Options room={room} />

      <details className="imp-panel imp-rules">
        <summary>How to play</summary>
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
      </details>

      <div className="imp-start">
        {problem && <p className="imp-start-note">{problem}</p>}
        <button
          type="button"
          className="btn btn-primary imp-big"
          disabled={problem !== null}
          onClick={() => act({ type: "start", rng: cryptoRandom })}
        >
          {room.played > 0 ? `Start round ${room.played + 1}` : "Start the game"}
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
            <li key={player.id} className="imp-player">
              <span className="imp-seat" aria-hidden="true">
                {i + 1}
              </span>
              <NameInput player={player} players={room.players} />
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
                <CloseIcon width={16} height={16} />
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
          <PlusIcon width={16} height={16} />
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
    <div className="imp-quick">
      <div>
        <span className="imp-quick-title">Quick start</span>
        <span className="imp-quick-note">Skip the names and play as Player 1, Player 2… Rename anyone later.</span>
      </div>
      <div className="imp-quick-row">
        <div className="imp-stepper" role="group" aria-label="How many players">
          <button
            type="button"
            aria-label="One player fewer"
            disabled={count <= MIN_PLAYERS}
            onClick={() => setCount((n) => n - 1)}
          >
            <MinusIcon width={16} height={16} />
          </button>
          <output aria-live="polite">{count}</output>
          <button
            type="button"
            aria-label="One player more"
            disabled={count >= MAX_PLAYERS}
            onClick={() => setCount((n) => n + 1)}
          >
            <PlusIcon width={16} height={16} />
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

/** A player's name, editable in place. A name that's empty or taken goes back to what it was. */
function NameInput({ player, players }: { player: Player; players: Player[] }) {
  return (
    <input
      key={player.name}
      className="imp-name-input"
      defaultValue={player.name}
      maxLength={MAX_NAME}
      aria-label={`Name of player ${player.name}`}
      autoComplete="off"
      enterKeyHint="done"
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      onBlur={(e) => {
        const name = e.currentTarget.value;
        if (nameProblem(players, name, player.id)) e.currentTarget.value = player.name;
        else if (name !== player.name) act({ type: "rename-player", id: player.id, name });
      }}
    />
  );
}

function Options({ room }: { room: Room }) {
  const { options, players } = room;
  const max = maxImposters(players.length);
  const imposters = imposterCount(room);
  const allOn = options.categories.length === CATEGORY_IDS.length;
  const set = (patch: Partial<Room["options"]>) => act({ type: "options", patch });

  return (
    <section className="imp-panel imp-options" aria-labelledby="imp-options-title">
      <div className="imp-panel-head">
        <h2 id="imp-options-title">Round</h2>
      </div>

      <Choice
        label="Imposters"
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

      <Choice label="Talking time">
        {TIMERS.map((seconds) => (
          <SegButton key={seconds} on={options.timer === seconds} onClick={() => set({ timer: seconds })}>
            {seconds === 0 ? "Off" : `${seconds / 60}m`}
          </SegButton>
        ))}
      </Choice>

      <div className="imp-field">
        <div className="imp-field-head">
          <span className="field-label" id="imp-categories">
            Categories
            <span className="field-note">
              {options.categories.length} of {CATEGORY_IDS.length}
            </span>
          </span>
          <button
            type="button"
            className="btn btn-quiet imp-small"
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
                <span aria-hidden="true">{emoji}</span>
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
              A buzz when talking time is up
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

function Choice({ label, note, children }: { label: string; note?: string; children: ReactNode }) {
  const id = useId();
  return (
    <div className="imp-field">
      <div className="imp-field-head">
        <span className="field-label" id={id}>
          {label}
        </span>
        <div className="seg" role="radiogroup" aria-labelledby={id}>
          {children}
        </div>
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
