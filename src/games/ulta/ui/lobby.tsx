"use client";

import { useId, useState, type ReactNode } from "react";

import { cryptoRandom } from "@/party/logic/random";
import { Roster } from "@/party/ui/roster";
import { Confirm } from "@/ui/confirm";
import { RestartIcon, ShuffleIcon } from "@/ui/icons";

import { checkTake } from "../logic/audio";
import {
  LIMITS,
  playsInTeams,
  startProblem,
  TARGETS,
  TEAM_IDS,
  TEAM_NAMES,
  teamPlayers,
  type Options,
  type Room,
} from "../logic/room";
import { HoldMic } from "./hold-mic";
import { BackwardsIcon, ChevronDownIcon, MicIcon, UltaMark } from "./marks";
import type { MicError } from "./mic";
import { MicTrouble } from "./mic-help";
import { playClips } from "./player";
import { readyTake, type Take } from "./takes";
import { act } from "./use-room";

/** Players, teams and options: the screen between games. */
export function Lobby({ room }: { room: Room }) {
  const problem = startProblem(room);
  const [ask, setAsk] = useState(false);
  const count = room.players.length;
  const teams = playsInTeams(count);

  return (
    <div className="party-setup">
      <header className="party-setup-intro">
        <div className="ul-title-card party-setup-title">
          <UltaMark className="ul-title-mark" />
          <div className="ul-title-plate party-setup-plate">
            <h1 className="ul-title-name party-setup-name">Ulta</h1>
            <span className="ul-title-meta party-setup-meta">2–20 players · one phone</span>
          </div>
        </div>
        <p className="game-blurb ul-blurb party-setup-blurb">
          Sing a line and the phone plays it backwards. A teammate copies the backwards sound, the phone flips the copy
          the right way round, and the team guesses the song.
        </p>
        <p className="ul-privacy party-setup-note">
          <MicIcon width={16} height={16} />
          <span>
            The mic is only on while you hold the button. Recordings stay in this phone&apos;s memory, are never saved or
            sent anywhere, and are gone after each turn.
          </span>
        </p>
      </header>

      <details className="party-setup-rules">
        <summary className="btn">
          How to play
          <ChevronDownIcon className="party-setup-rules-chevron" />
        </summary>
        <div className="card party-setup-rules-body">
          <ol>
            <li>
              The singer picks a song: one of their own, or &ldquo;Suggest one&rdquo;, which only they see. Then they
              hold the mic button and sing a line, 4 to 8 seconds.
            </li>
            <li>
              The phone plays it backwards. The copier, from the same team, can listen 3 times, then holds the button
              and copies the backwards sound as closely as they can.
            </li>
            <li>
              The phone flips the copy the right way round. The team has 45 seconds to guess the song, and the singer
              says if they got it.
            </li>
            <li>If they miss, the other team gets one guess to steal the point.</li>
            <li>Then hear the original and the ulta version back to back. First team to the target wins.</li>
          </ol>
          <p>Hum or la-la if you don&apos;t know the words. Everyone takes turns singing and copying, in order.</p>
        </div>
      </details>

      <div className="party-setup-side">
        <section className="card section party-setup-players ul-players" aria-labelledby="ul-players-title">
          <h2 className="tape" id="ul-players-title">
            Players <span className="tape-count">· {count}</span>
          </h2>
          {count > 0 && (
            <button type="button" className="btn ul-small ul-corner" onClick={() => setAsk(true)}>
              <RestartIcon width={15} height={15} strokeWidth={2.6} />
              Reset
            </button>
          )}
          {ask && (
            <Confirm
              title="Start over?"
              detail={`Removes ${count === 1 ? "the player" : `all ${count} players`}, so you can quick start or add names again. Options stay.`}
              yes="Reset"
              onNo={() => setAsk(false)}
              onYes={() => {
                act({ type: "clear-room" });
                setAsk(false);
              }}
            />
          )}
          <Roster players={room.players} limits={LIMITS} onAction={act} />
          {count > 0 && !teams && (
            <p className="ul-note-line">
              With {count === 1 ? "1 player" : `${count} players`} it&apos;s just for fun: everyone takes turns singing and
              copying, and there&apos;s no score. From 4 players on, it&apos;s two teams.
            </p>
          )}
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
            Start the game
            <MicIcon width={22} height={22} />
          </button>
        </div>
      </div>

      <div className="party-setup-main">
        {teams && <TeamsCard room={room} />}
        <OptionsCard options={room.options} teams={teams} />
      </div>
    </div>
  );
}

/** Seedha and Ulta: tap a name to move it across, or shuffle. */
function TeamsCard({ room }: { room: Room }) {
  return (
    <section className="card section ul-teams" aria-labelledby="ul-teams-title">
      <h2 className="tape is-game" id="ul-teams-title">
        Teams
      </h2>
      <button
        type="button"
        className="btn ul-small ul-corner"
        onClick={() => act({ type: "shuffle-teams", rng: cryptoRandom })}
      >
        <ShuffleIcon width={15} height={15} strokeWidth={2.4} />
        Shuffle
      </button>
      <div className="ul-team-cols">
        {TEAM_IDS.map((team) => {
          const players = teamPlayers(room, team);
          return (
            <div key={team} className="ul-team" data-team={team}>
              <h3 className="ul-team-name">
                {TEAM_NAMES[team]} <span className="tape-count">· {players.length}</span>
              </h3>
              <ul className="ul-team-list">
                {players.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      className="ul-team-pill"
                      aria-label={`${p.name}, on ${TEAM_NAMES[team]}. Move to ${TEAM_NAMES[team === "a" ? "b" : "a"]}`}
                      onClick={() => act({ type: "move-player", id: p.id })}
                    >
                      {p.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
      <p className="ul-note-line">Tap a name to move it to the other team. Each team needs at least 2.</p>
    </section>
  );
}

function OptionsCard({ options, teams }: { options: Options; teams: boolean }) {
  const set = (patch: Partial<Options>) => act({ type: "options", patch });
  return (
    <section className="card section party-setup-options" aria-labelledby="ul-options-title">
      <h2 className="tape is-game" id="ul-options-title">
        Options
      </h2>

      <div className="party-setup-fields ul-fields">
        {teams && (
          <Choice label="Play to" note={`The first team to ${options.target} points wins.`}>
            {TARGETS.map((n) => (
              <button key={n} type="button" role="radio" aria-checked={options.target === n} onClick={() => set({ target: n })}>
                {n}
              </button>
            ))}
          </Choice>
        )}

        <div className={teams ? "switches ul-switches" : "switches ul-switches party-setup-wide"}>
          <div className="switch-row">
            <span>
              <span className="switch-label" id="ul-sound-label">
                Sound
              </span>
              <span className="switch-detail" id="ul-sound-detail">
                The timer&apos;s ticks and the cheers. The singing always plays.
              </span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={options.sound}
              aria-labelledby="ul-sound-label"
              aria-describedby="ul-sound-detail"
              className="switch"
              onClick={() => set({ sound: !options.sound })}
            >
              <span />
            </button>
          </div>
        </div>

        <TryMic />
      </div>
    </section>
  );
}

/** Try the mic before playing: say something, hear it backwards. Asks for the mic here, not mid-turn. */
function TryMic() {
  const [take, setTake] = useState<Take | null>(null);
  const [trouble, setTrouble] = useState<MicError | null>(null);
  const [note, setNote] = useState<string | null>(null);
  return (
    <div className="ul-try party-setup-wide">
      <span className="field-label">Try the mic</span>
      <div className="ul-try-row">
        <HoldMic
          label="Hold and say hi"
          maxSeconds={5}
          quiet
          onDone={(clip) => {
            setTrouble(null);
            const check = checkTake(clip, 0.3);
            if (check.kind === "ok") {
              setTake(readyTake(check.clip));
              setNote(null);
            } else setNote("Didn't hear anything. Hold the button and speak up.");
          }}
          onProblem={setTrouble}
        />
        <button type="button" className="btn ul-small" disabled={!take} onClick={() => take && playClips([take.back])}>
          <BackwardsIcon width={14} height={14} />
          Play it backwards
        </button>
      </div>
      {note && <p className="ul-take-note">{note}</p>}
      {trouble && <MicTrouble problem={trouble.problem} />}
      <p className="ul-field-note">Asks for the mic now, so it doesn&apos;t interrupt the first turn.</p>
    </div>
  );
}

function Choice({ label, note, children }: { label: string; note?: string; children: ReactNode }) {
  const id = useId();
  return (
    <div className="ul-field">
      <span className="field-label" id={id}>
        {label}
      </span>
      <div className="seg" role="radiogroup" aria-labelledby={id}>
        {children}
      </div>
      {note && <p className="ul-field-note">{note}</p>}
    </div>
  );
}
