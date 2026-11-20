"use client";

import { useId, useState, type FormEvent } from "react";

import {
  cleanName,
  DEFAULT_LIMITS,
  MAX_NAME,
  nameProblem,
  QUICK_PLAYERS,
  type Limits,
  type Player,
  type PlayerAction,
} from "@/party/logic/players";
import { cryptoRandom, randomId } from "@/party/logic/random";
import { CloseIcon, MinusIcon, PlusIcon } from "@/ui/icons";

type OnAction = (action: PlayerAction) => void;

/**
 * The player list on a game's setup screen: Quick start (Player 1…N) for an empty
 * table, then a seat pill per player to rename in place or remove, and a field to add
 * a name. The game keeps the list (logic/players.ts) and applies what `onAction` sends.
 */
export function Roster({
  players,
  scores,
  limits = DEFAULT_LIMITS,
  onAction,
}: {
  players: readonly Player[];
  /** Points on each seat, once there are any to show. */
  scores?: Record<string, number>;
  limits?: Limits;
  onAction: OnAction;
}) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();

  const add = (e: FormEvent) => {
    e.preventDefault();
    const problem = nameProblem(players, draft, { max: limits.max });
    if (problem) {
      setError(problem);
      return;
    }
    onAction({ type: "add-player", id: randomId(cryptoRandom), name: draft });
    setDraft("");
    setError(null);
  };

  return (
    <>
      {players.length > 0 ? (
        <ol className="party-roster">
          {players.map((player, i) => (
            <li key={player.id} className="party-seat-pill">
              <span className="party-seat" aria-hidden="true">
                {i + 1}
              </span>
              <NameInput key={player.name} player={player} players={players} onAction={onAction} />
              {scores && (
                <span className="party-points" title="Points">
                  {scores[player.id] ?? 0}
                  <span className="party-visually-hidden"> points</span>
                </span>
              )}
              <button
                type="button"
                className="party-remove"
                aria-label={`Remove ${player.name}`}
                title="Remove"
                onClick={() => onAction({ type: "remove-player", id: player.id })}
              >
                <CloseIcon width={16} height={16} strokeWidth={2.6} />
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <>
          <QuickStart limits={limits} onAction={onAction} />
          <p className="party-or">or add names, in the order you&apos;re sitting</p>
        </>
      )}
      <form className="party-add" onSubmit={add}>
        <label htmlFor={inputId} className="party-visually-hidden">
          New player&apos;s name
        </label>
        <input
          id={inputId}
          className="party-input"
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
        <p className="party-error" id={`${inputId}-error`} role="alert">
          {error}
        </p>
      )}
    </>
  );
}

/** No time for names: a number of players, called Player 1, Player 2, … */
function QuickStart({ limits, onAction }: { limits: Limits; onAction: OnAction }) {
  const [count, setCount] = useState(() => Math.min(limits.max, Math.max(limits.min, QUICK_PLAYERS)));
  return (
    <div>
      <p className="party-quick-title">Quick start</p>
      <p className="party-quick-note">Skip the names and play as Player 1, Player 2… Rename anyone later.</p>
      <div className="party-quick-row">
        <div className="party-stepper" role="group" aria-label="How many players">
          <button
            type="button"
            className="icon-btn"
            aria-label="One player fewer"
            disabled={count <= limits.min}
            onClick={() => setCount((n) => n - 1)}
          >
            <MinusIcon width={16} height={16} strokeWidth={2.6} />
          </button>
          <output aria-live="polite">{count}</output>
          <button
            type="button"
            className="icon-btn"
            aria-label="One player more"
            disabled={count >= limits.max}
            onClick={() => setCount((n) => n + 1)}
          >
            <PlusIcon width={16} height={16} strokeWidth={2.6} />
          </button>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => onAction({ type: "quick-players", count, rng: cryptoRandom })}
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
function NameInput({ player, players, onAction }: { player: Player; players: readonly Player[]; onAction: OnAction }) {
  const [value, setValue] = useState(player.name);
  return (
    <span className="party-name" data-value={value}>
      <input
        className="party-name-input"
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
          if (name === player.name || nameProblem(players, value, { self: player.id })) setValue(player.name);
          else onAction({ type: "rename-player", id: player.id, name });
        }}
      />
    </span>
  );
}
