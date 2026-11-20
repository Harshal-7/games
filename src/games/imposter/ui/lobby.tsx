"use client";

import { useId, useState, type ReactNode } from "react";

import { PickerLink } from "@/games/finger-picker/ui/setup-link";
import { MAX_PLAYERS, MIN_PLAYERS } from "@/party/logic/players";
import { cryptoRandom } from "@/party/logic/random";
import { Roster } from "@/party/ui/roster";
import { Confirm } from "@/ui/confirm";
import { RestartIcon } from "@/ui/icons";

import { PACK_IDS, PACKS } from "../logic/questions";
import { imposterCount, maxImposters, startProblem, type Clue, type Mode, type Room } from "../logic/room";
import { CATEGORIES, CATEGORY_IDS } from "../logic/words";
import { ChevronDownIcon, DealIcon } from "./marks";
import { act } from "./use-room";

const MODE_LABELS: Record<Mode, { label: string; note: string }> = {
  words: { label: "Words", note: "Everyone gets the secret word except the imposter." },
  questions: {
    label: "Questions",
    note: "Everyone gets a question. The imposter's is a different one, and nobody's told.",
  },
};

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
    <div className="party-setup">
      <header className="party-setup-intro">
        <div className="imp-title-card party-setup-title">
          <span className="imp-title-mark" aria-hidden="true">
            ?
          </span>
          <span className="imp-title-mark is-turned" aria-hidden="true">
            ?
          </span>
          <div className="imp-title-plate party-setup-plate">
            <h1 className="imp-title-name party-setup-name">Imposter</h1>
            <span className="imp-title-meta party-setup-meta">
              {MIN_PLAYERS}–{MAX_PLAYERS} players · one phone
            </span>
          </div>
        </div>
        <p className="game-blurb imp-blurb party-setup-blurb">
          One phone, one secret word. Everyone gets it except the imposter, who has to fake it.
        </p>
      </header>

      <details className="party-setup-rules">
        <summary className="btn">
          How to play
          <ChevronDownIcon className="party-setup-rules-chevron" />
        </summary>
        <div className="card party-setup-rules-body">
          <ol>
            <li>Add everyone, then pass the phone round. Each player holds their card to see it, alone.</li>
            <li>Everyone gets the same secret word, except the imposter.</li>
            <li>Go round the circle: one word each about the secret word. Not too obvious.</li>
            <li>Vote for who&apos;s faking it. A caught imposter gets one guess at the word to steal the round.</li>
          </ol>
          <p>
            Questions mode: everyone gets the same question except the imposter, who gets a different one without
            knowing it. Everyone answers at once, then the real question is shown and the table works out whose
            answer doesn&apos;t fit. There&apos;s no guess at the end.
          </p>
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

      <div className="party-setup-side">
        <section className="card section party-setup-players imp-players" aria-labelledby="imp-players-title">
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
          <Roster players={room.players} scores={room.played > 0 ? room.scores : undefined} onAction={act} />
          <PickerLink from="imposter" />
        </section>

        {/* Stuck to the bottom on phones, on a solid tray, so it's always in reach; on big
            screens right under Players. */}
        <div className="party-setup-start">
          {problem && <p className="party-setup-start-note">{problem}</p>}
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

      <div className="party-setup-main">
        <Options room={room} />
      </div>
    </div>
  );
}

function Options({ room }: { room: Room }) {
  const { options, players } = room;
  const max = maxImposters(players.length);
  const imposters = imposterCount(room);
  const questions = options.mode === "questions";
  const set = (patch: Partial<Room["options"]>) => act({ type: "options", patch });

  return (
    <section className="card section party-setup-options" aria-labelledby="imp-options-title">
      <h2 className="tape is-game" id="imp-options-title">
        Options
      </h2>

      <div className="party-setup-fields">
        <Choice label="Mode" note={MODE_LABELS[options.mode].note}>
          {(Object.keys(MODE_LABELS) as Mode[]).map((mode) => (
            <SegButton key={mode} on={options.mode === mode} onClick={() => set({ mode })}>
              {MODE_LABELS[mode].label}
            </SegButton>
          ))}
        </Choice>

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

        {/* In Questions mode the imposter isn't told, so there's nothing for them to get. */}
        {!questions && (
          <Choice label="Imposter gets" note={CLUE_LABELS[options.clue].note}>
            {(Object.keys(CLUE_LABELS) as Clue[]).map((clue) => (
              <SegButton key={clue} on={options.clue === clue} onClick={() => set({ clue })}>
                {CLUE_LABELS[clue].label}
              </SegButton>
            ))}
          </Choice>
        )}

        {questions ? (
          <Chips
            label="Packs"
            all={PACK_IDS}
            picked={options.packs}
            items={PACKS.map(({ id, label, emoji, pairs }) => ({ id, label, emoji, title: `${pairs.length} pairs` }))}
            onChange={(packs) => set({ packs })}
          />
        ) : (
          <Chips
            label="Categories"
            all={CATEGORY_IDS}
            picked={options.categories}
            items={CATEGORIES.map(({ id, label, emoji, words }) => ({ id, label, emoji, title: `${words.length} words` }))}
            onChange={(categories) => set({ categories })}
          />
        )}

        <div className="switches party-setup-switches party-setup-wide">
          <span className="field-label party-setup-switches-label">Sound</span>
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
      </div>
    </section>
  );
}

/** A wide row of chips to switch on and off, with Pick all / Clear. Keeps the list's order. */
function Chips<Id extends string>({
  label,
  all,
  picked,
  items,
  onChange,
}: {
  label: string;
  all: readonly Id[];
  picked: readonly Id[];
  items: { id: Id; label: string; emoji: string; title: string }[];
  onChange: (picked: Id[]) => void;
}) {
  const id = useId();
  const allOn = picked.length === all.length;
  return (
    <div className="imp-field party-setup-wide">
      <div className="imp-field-head">
        <span className="field-label" id={id}>
          {label}
          <span className="imp-cat-count">
            {picked.length} of {all.length}
          </span>
        </span>
        <button type="button" className="btn imp-small" onClick={() => onChange(allOn ? [] : [...all])}>
          {allOn ? "Clear" : "Pick all"}
        </button>
      </div>
      <div className="imp-chips" role="group" aria-labelledby={id}>
        {items.map((item) => {
          const on = picked.includes(item.id);
          return (
            <button
              key={item.id}
              type="button"
              className="imp-chip"
              aria-pressed={on}
              title={item.title}
              onClick={() =>
                onChange(on ? picked.filter((p) => p !== item.id) : all.filter((p) => p === item.id || picked.includes(p)))
              }
            >
              <span className="imp-chip-emoji" aria-hidden="true">
                {item.emoji}
              </span>
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
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
