"use client";

import { useId, useState, type ReactNode } from "react";

import { cryptoRandom } from "@/party/logic/random";
import { Roster } from "@/party/ui/roster";
import { Confirm } from "@/ui/confirm";
import { RestartIcon } from "@/ui/icons";

import { startProblem, TALK_MINUTES, type Options as GameOptions, type Room, type Tie } from "../logic/game";
import { autoMafia, LIMITS, MAFIA_CHOICES, mafiaCount, maxMafia } from "../logic/roles";
import { canSpeak, chooseVoice, say, unlock, useVoices } from "./narrator";
import { act } from "./use-room";

const TIE_LABELS: Record<Tie, { label: string; note: string }> = {
  nobody: { label: "No one is out", note: "On a tie, nobody is out and the night falls." },
  again: { label: "Vote again", note: "On a tie, everyone points once more. A second tie: nobody is out." },
};

/** Players, options and scores: the screen between games. */
export function Lobby({ room }: { room: Room }) {
  const problem = startProblem(room);
  const [ask, setAsk] = useState<"new-room" | "reset" | null>(null);
  const count = room.players.length;

  return (
    <div className="maf-lobby">
      <header className="maf-intro">
        <div className="maf-title-card">
          <MoonMark />
          <StarMark />
          <div className="maf-title-plate">
            <h1 className="maf-title-name">Mafia</h1>
            <span className="maf-title-meta">
              {LIMITS.min}–{LIMITS.max} players · one phone
            </span>
          </div>
        </div>
        <p className="game-blurb maf-blurb">
          The phone narrates the night, so nobody has to sit out to run it. Find the Mafia before they take over the
          town.
        </p>
      </header>

      <section className="card section maf-players" aria-labelledby="maf-players-title">
        <h2 className="tape" id="maf-players-title">
          Players <span className="tape-count">· {count}</span>
        </h2>
        {/* After a game: a new room keeps the players. Before one: Reset clears them. */}
        {room.played > 0 ? (
          <button type="button" className="btn maf-small maf-new-room" onClick={() => setAsk("new-room")}>
            <RestartIcon width={15} height={15} strokeWidth={2.6} />
            New room
          </button>
        ) : (
          count > 0 && (
            <button type="button" className="btn maf-small maf-new-room" onClick={() => setAsk("reset")}>
              <RestartIcon width={15} height={15} strokeWidth={2.6} />
              Reset
            </button>
          )
        )}
        {ask === "new-room" && (
          <Confirm
            title="Start a new room?"
            detail="Scores and everyone's turns as Mafia go back to zero. Players and options stay."
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
        <Roster
          players={room.players}
          scores={room.played > 0 ? room.scores : undefined}
          limits={LIMITS}
          onAction={act}
        />
        {count > 0 && count < 7 && <p className="maf-players-note">Best with 7 to 12 players.</p>}
      </section>

      <Options room={room} />

      <details className="maf-rules">
        <summary className="btn">
          How to play
          <ChevronDownIcon className="maf-rules-chevron" />
        </summary>
        <div className="card maf-rules-body">
          <ol>
            <li>Add everyone in the order you&apos;re sitting. Pass the phone: each player holds their card to see their role, alone.</li>
            <li>
              Night: put the phone face up in the middle, volume up. It calls each role in turn while everyone else keeps
              their eyes closed. Players who are out can watch.
            </li>
            <li>Morning: the phone tells you who the Mafia got. Talk it out, point on three, and the most fingers is out.</li>
            <li>The town wins when every Mafia is out. The Mafia win once there are as many of them as everyone else.</li>
          </ol>
          <p>
            Fair play: every night turn takes the same time, however fast the tap. A Doctor or Police who is out still gets
            called. Over a few games, everyone gets a turn as Mafia.
          </p>
          <p>Points: when the town wins, every town player gets 1. When the Mafia win, each of them gets 2.</p>
        </div>
      </details>

      {/* Stuck to the bottom on phones, on a solid tray, so it's always in reach. */}
      <div className="maf-start">
        {problem && <p className="maf-start-note">{problem}</p>}
        <button
          type="button"
          className="btn btn-primary btn-big"
          disabled={problem !== null}
          onClick={() => act({ type: "start", rng: cryptoRandom })}
        >
          {room.played > 0 ? `Deal game ${room.played + 1}` : "Deal the roles"}
        </button>
      </div>
    </div>
  );
}

function Options({ room }: { room: Room }) {
  const { options, players } = room;
  const n = players.length;
  const max = maxMafia(Math.max(n, LIMITS.min));
  const dealt = mafiaCount(Math.max(n, LIMITS.min), options.mafia);
  const set = (patch: Partial<GameOptions>) => act({ type: "options", patch });

  let mafiaNote: string;
  if (options.mafia === null) {
    mafiaNote = n >= LIMITS.min ? `By table size: ${dealt} Mafia for ${n} players.` : "By table size: 1 Mafia for 5–6 players, 2 for 7–9, 3 for 10–13, 4 for 14–15.";
  } else if (options.mafia > max) {
    mafiaNote = `${n} players can take ${max} Mafia at most, so ${dealt} it is.`;
  } else {
    mafiaNote = n >= LIMITS.min && options.mafia !== autoMafia(n) ? `The usual for ${n} players is ${autoMafia(n)}.` : "";
  }

  return (
    <section className="card section maf-options" aria-labelledby="maf-options-title">
      <h2 className="tape is-game" id="maf-options-title">
        Options
      </h2>

      <Choice label="Mafia" note={mafiaNote || undefined}>
        <SegButton on={options.mafia === null} onClick={() => set({ mafia: null })}>
          Auto
        </SegButton>
        {MAFIA_CHOICES.map((m) => (
          <SegButton key={m} on={options.mafia === m} disabled={m > max} onClick={() => set({ mafia: m })}>
            {m}
          </SegButton>
        ))}
      </Choice>

      <div className="maf-field">
        <span className="field-label">Roles</span>
        <div className="switches">
          <SwitchRow
            label="Doctor"
            detail="Saves one person each night"
            on={options.doctor}
            onToggle={() => set({ doctor: !options.doctor })}
          />
          <SwitchRow
            label="Police"
            detail="Checks one person each night: Mafia or not"
            on={options.police}
            onToggle={() => set({ police: !options.police })}
          />
        </div>
      </div>

      <Choice label="Talk time">
        {TALK_MINUTES.map((m) => (
          <SegButton key={m} on={options.talk === m} onClick={() => set({ talk: m })}>
            {m} min
          </SegButton>
        ))}
      </Choice>

      <Choice label="A tied vote" note={TIE_LABELS[options.tie].note}>
        {(Object.keys(TIE_LABELS) as Tie[]).map((tie) => (
          <SegButton key={tie} on={options.tie === tie} onClick={() => set({ tie })}>
            {TIE_LABELS[tie].label}
          </SegButton>
        ))}
      </Choice>

      <div className="switches maf-switches">
        <SwitchRow
          label="Narrator voice"
          detail={
            canSpeak()
              ? "A narrator reads every line out loud. Off: the lines only show on screen."
              : "This browser can't play sound, so the lines only show on screen."
          }
          on={options.voice}
          onToggle={() => set({ voice: !options.voice })}
        />
        {options.voice && <VoicePicker chosen={options.voiceName} onChoose={(voiceName) => set({ voiceName })} />}
        <SwitchRow
          label="Sound and vibration"
          detail="A buzz when you hold your card, a quiet night sound that hides who leans in to tap, ticks in the last 10 seconds of talking"
          on={options.sound}
          onToggle={() => set({ sound: !options.sound })}
        />
      </div>
    </section>
  );
}

/**
 * The narrator is recorded, except lines with a player's name: those use one of the
 * phone's voices, the best American English one by default. Hear it says such a line.
 */
function VoicePicker({ chosen, onChoose }: { chosen: string | null; onChoose: (name: string | null) => void }) {
  const voices = useVoices();
  const id = useId();
  if (voices.length === 0) return null;
  const known = chosen !== null && voices.some((v) => v.name === chosen);
  const hear = () => {
    chooseVoice(known ? chosen : null);
    unlock();
    say(`hear:${Date.now()}`, ["Rohan went out for chai at 3 a.m. and never came back.", "Rohan was a Villager."], true);
  };
  return (
    <div className="maf-voice">
      <label className="switch-label" htmlFor={id}>
        Voice for names
      </label>
      <div className="maf-voice-row">
        <select
          id={id}
          className="maf-select"
          value={known ? chosen : ""}
          onChange={(e) => onChoose(e.target.value || null)}
        >
          <option value="">Best on this phone ({voices[0].name})</option>
          {voices.map((v) => (
            <option key={`${v.name}-${v.lang}`} value={v.name}>
              {v.name} · {v.lang.replace("_", "-")}
            </option>
          ))}
        </select>
        <button type="button" className="btn maf-small" onClick={hear}>
          Hear it
        </button>
      </div>
      <p className="switch-detail">
        The narrator is recorded. Only lines with a player&apos;s name, like the morning&apos;s story, use your
        phone&apos;s voice. For a better one, download an Enhanced English voice in your phone&apos;s settings (on
        iPhones: Accessibility, Spoken Content, Voices), then pick it here.
      </p>
    </div>
  );
}

function Choice({ label, note, children }: { label: string; note?: string; children: ReactNode }) {
  const id = useId();
  return (
    <div className="maf-field">
      <span className="field-label" id={id}>
        {label}
      </span>
      <div className="seg" role="radiogroup" aria-labelledby={id}>
        {children}
      </div>
      {note && <p className="maf-field-note">{note}</p>}
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

function SwitchRow({ label, detail, on, onToggle }: { label: string; detail: string; on: boolean; onToggle: () => void }) {
  const id = useId();
  return (
    <div className="switch-row">
      <span>
        <span className="switch-label" id={`${id}-label`}>
          {label}
        </span>
        <span className="switch-detail" id={`${id}-detail`}>
          {detail}
        </span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-labelledby={`${id}-label`}
        aria-describedby={`${id}-detail`}
        className="switch"
        onClick={onToggle}
      >
        <span />
      </button>
    </div>
  );
}

/** The title card's corners: a crescent moon top left, a star bottom right. */
function MoonMark() {
  return (
    <svg className="maf-title-mark" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
      <path d="M15 2.5a9.5 9.5 0 1 0 6.5 16.4A8 8 0 0 1 15 2.5Z" />
    </svg>
  );
}

function StarMark() {
  return (
    <svg className="maf-title-mark is-turned" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path d="M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2Z" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
