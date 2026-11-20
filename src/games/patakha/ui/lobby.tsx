"use client";

import { useId, useState, type ReactNode } from "react";

import { MAX_PLAYERS, MIN_PLAYERS } from "@/party/logic/players";
import { cryptoRandom } from "@/party/logic/random";
import { Roster } from "@/party/ui/roster";
import { Confirm } from "@/ui/confirm";
import { RestartIcon, SpeakerIcon } from "@/ui/icons";

import { FUSE_IDS, FUSE_LENGTHS } from "../logic/fuse";
import { PACK_IDS, PACKS } from "../logic/prompts";
import { LIVES_CHOICES, startProblem, type Options, type Room } from "../logic/room";
import { Firecracker } from "./firecracker";
import { ChevronDownIcon, FlameIcon } from "./marks";
import { testSound } from "./sounds";
import { act } from "./use-room";

/** Players, options and wins: the screen between games. */
export function Lobby({ room }: { room: Room }) {
  const problem = startProblem(room);
  const [ask, setAsk] = useState<"new-room" | "reset" | null>(null);
  const count = room.players.length;

  return (
    <div className="party-setup">
      <header className="party-setup-intro">
        <div className="pk-title-card party-setup-title">
          <Firecracker lit className="pk-title-cracker" />
          <div className="pk-title-plate party-setup-plate">
            <h1 className="pk-title-name party-setup-name">Patakha</h1>
            <span className="pk-title-meta party-setup-meta">
              {MIN_PLAYERS}–{MAX_PLAYERS} players · one phone
            </span>
          </div>
        </div>
        <p className="game-blurb pk-blurb party-setup-blurb">
          The phone is a firecracker with a hidden fuse. Say an answer, pass it on, and don&apos;t be holding it when
          it bursts.
        </p>
      </header>

      <details className="party-setup-rules">
        <summary className="btn">
          How to play
          <ChevronDownIcon className="party-setup-rules-chevron" />
        </summary>
        <div className="card party-setup-rules-body">
          <ol>
            <li>Sit in a circle, in the order of the list. The phone goes round that way.</li>
            <li>
              Light the fuse and a prompt shows up, like &ldquo;a Shah Rukh film&rdquo;. Say an answer out loud, tap
              Pass and hand the phone on.
            </li>
            <li>
              No repeats in a round. If an answer doesn&apos;t count, anyone can shout &ldquo;Challenge!&rdquo;. The
              table decides, and the holder gives another one before passing.
            </li>
            <li>
              The ticking speeds up near the end, but nobody knows when it goes. Whoever is holding the phone at the
              bang loses a life, no arguing.
            </li>
            <li>The loser lights the next round. Lose every life and you&apos;re out. The last one standing wins.</li>
          </ol>
          <p>
            Fair play: the fuse is different every round and never shown. Lock the phone or switch apps and it pauses.
          </p>
        </div>
      </details>

      <div className="party-setup-side">
        <section className="card section party-setup-players pk-players" aria-labelledby="pk-players-title">
          <h2 className="tape" id="pk-players-title">
            Players <span className="tape-count">· {count}</span>
          </h2>
          {/* After a game: a new room keeps the players. Before one: Reset clears them. */}
          {room.played > 0 ? (
            <button type="button" className="btn pk-small pk-corner" onClick={() => setAsk("new-room")}>
              <RestartIcon width={15} height={15} strokeWidth={2.6} />
              New room
            </button>
          ) : (
            count > 0 && (
              <button type="button" className="btn pk-small pk-corner" onClick={() => setAsk("reset")}>
                <RestartIcon width={15} height={15} strokeWidth={2.6} />
                Reset
              </button>
            )
          )}
          {ask === "new-room" && (
            <Confirm
              title="Start a new room?"
              detail="Everyone's wins go back to zero. Players and options stay."
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
          <Roster players={room.players} scores={room.played > 0 ? room.wins : undefined} onAction={act} />
          {count > 1 && <p className="pk-seat-note">The phone goes round in this order. Sit the same way.</p>}
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
            {room.played > 0 ? "Play again" : "Start the game"}
            <FlameIcon width={22} height={22} />
          </button>
        </div>
      </div>

      <div className="party-setup-main">
        <OptionsCard options={room.options} />
      </div>
    </div>
  );
}

function OptionsCard({ options }: { options: Options }) {
  const set = (patch: Partial<Options>) => act({ type: "options", patch });
  const { min, max } = FUSE_LENGTHS[options.fuse];
  const allOn = options.packs.length === PACK_IDS.length;
  const packsId = useId();

  return (
    <section className="card section party-setup-options" aria-labelledby="pk-options-title">
      <h2 className="tape is-game" id="pk-options-title">
        Options
      </h2>

      <div className="party-setup-fields">
        <Choice
          label="Lives"
          narrow
          note={`Everyone starts with ${options.lives === 1 ? "1 life" : `${options.lives} lives`}. Last one standing wins.`}
        >
          {LIVES_CHOICES.map((n) => (
            <SegButton key={n} on={options.lives === n} onClick={() => set({ lives: n })}>
              {n}
            </SegButton>
          ))}
        </Choice>

        <Choice
          label="Fuse"
          note={`Burns for ${min / 1000} to ${max / 1000} seconds, different every round. Nobody sees how long.`}
        >
          {FUSE_IDS.map((id) => (
            <SegButton key={id} on={options.fuse === id} onClick={() => set({ fuse: id })}>
              {FUSE_LENGTHS[id].label}
            </SegButton>
          ))}
        </Choice>

        <div className="pk-field party-setup-wide">
          <div className="pk-field-head">
            <span className="field-label" id={packsId}>
              Prompts
              <span className="pk-pack-count">
                {options.packs.length} of {PACK_IDS.length}
              </span>
            </span>
            <button type="button" className="btn pk-small" onClick={() => set({ packs: allOn ? [] : [...PACK_IDS] })}>
              {allOn ? "Clear" : "Pick all"}
            </button>
          </div>
          <div className="pk-chips" role="group" aria-labelledby={packsId}>
            {PACKS.map(({ id, label, emoji, prompts }) => {
              const on = options.packs.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  className="pk-chip"
                  aria-pressed={on}
                  title={`${prompts.length} prompts`}
                  onClick={() =>
                    set({ packs: on ? options.packs.filter((p) => p !== id) : PACK_IDS.filter((p) => p === id || options.packs.includes(p)) })
                  }
                >
                  <span className="pk-chip-emoji" aria-hidden="true">
                    {emoji}
                  </span>
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <Choice
          label="Answers"
          note={
            options.english
              ? "Only English words count. Film and people's names are fine."
              : "Any language counts: Hindi, Marathi, Tamil, anything the table understands."
          }
        >
          <SegButton on={!options.english} onClick={() => set({ english: false })}>
            Any language
          </SegButton>
          <SegButton on={options.english} onClick={() => set({ english: true })}>
            English only
          </SegButton>
        </Choice>

        <div className="switches party-setup-switches">
          <span className="field-label party-setup-switches-label">Sound</span>
          <div className="switch-row">
            <span>
              <span className="switch-label" id="pk-sound-label">
                Sound and buzz
              </span>
              <span className="switch-detail" id="pk-sound-detail">
                The ticking fuse and the bang, with a buzz on Android. The game is mostly sound.
              </span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={options.sound}
              aria-labelledby="pk-sound-label"
              aria-describedby="pk-sound-detail"
              className="switch"
              onClick={() => set({ sound: !options.sound })}
            >
              <span />
            </button>
          </div>
          {options.sound && (
            <div className="pk-test">
              <button type="button" className="btn pk-small" onClick={testSound}>
                <SpeakerIcon width={16} height={16} />
                Test sound
              </button>
              <p className="pk-field-note">Hear nothing? Turn the volume up. On an older iPhone, flip the silent switch off.</p>
            </div>
          )}
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
    <div className="pk-field">
      <span className="field-label" id={id}>
        {label}
      </span>
      <div className={narrow ? "seg is-narrow" : "seg"} role="radiogroup" aria-labelledby={id}>
        {children}
      </div>
      {note && <p className="pk-field-note">{note}</p>}
    </div>
  );
}

function SegButton({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" role="radio" aria-checked={on} onClick={onClick}>
      {children}
    </button>
  );
}
