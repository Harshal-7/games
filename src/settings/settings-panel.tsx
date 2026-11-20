"use client";

import { Suspense, useId, type ReactNode } from "react";

import { BOARD_STYLES, PIECE_STYLES } from "@/games/knights-tour/styles";
import { Board } from "@/games/knights-tour/ui/board";
import { cue } from "@/games/knights-tour/ui/feedback";
import { PIECES } from "@/games/knights-tour/ui/knight-piece";
import { CheckIcon, RestartIcon, SpeakerIcon } from "@/ui/icons";
import { TopBar } from "@/ui/top-bar";

import { DEFAULT_SETTINGS, MODES, type KnightsTourSettings, type Settings } from "./settings";
import { BackLink, SettingsBack } from "./settings-back";
import { updateSettings, useSettings } from "./store";

import "@/games/knights-tour/board-styles.css";
import "@/games/knights-tour/ui/knights-tour.css";
import "./settings.css";

// A few real knight jumps, so the preview shows numbers, the trail and the dots.
const PREVIEW_PATH = [0, 7, 14, 23];

type Flag = "numbers" | "moves" | "trail" | "sound" | "vibrate";

const SWITCHES: { key: Flag; label: string; detail: string }[] = [
  { key: "numbers", label: "Move numbers", detail: "Number each visited square" },
  { key: "moves", label: "Possible moves", detail: "Dots where the knight can go" },
  { key: "trail", label: "Trail", detail: "Line for the last two jumps" },
  { key: "sound", label: "Sound", detail: "Click on each jump, chime at the end" },
  { key: "vibrate", label: "Vibration", detail: "Short buzz on phones that support it" },
];

// The remembered board size isn't on this page, so it never counts as a change and
// Reset leaves it alone.
const withoutSize = (s: Settings) => ({
  ...s,
  knightsTour: { ...s.knightsTour, size: DEFAULT_SETTINGS.knightsTour.size },
});

export function SettingsPanel() {
  const settings = useSettings();
  const kt = settings.knightsTour;
  const lookId = useId();
  const ktId = useId();
  const setKnightsTour = (patch: Partial<KnightsTourSettings>) =>
    updateSettings((s) => ({ ...s, knightsTour: { ...s.knightsTour, ...patch } }));
  const isDefault = JSON.stringify(withoutSize(settings)) === JSON.stringify(DEFAULT_SETTINGS);
  const reset = () =>
    updateSettings((s) => ({
      ...DEFAULT_SETTINGS,
      knightsTour: { ...DEFAULT_SETTINGS.knightsTour, size: s.knightsTour.size },
    }));

  function toggle(key: Flag) {
    const on = !kt[key];
    setKnightsTour({ [key]: on });
    // Let people hear or feel what they just switched on.
    if (on && key === "sound") cue("move", { sound: true, vibrate: false });
    if (on && key === "vibrate") cue("move", { sound: false, vibrate: true });
  }

  return (
    <div className="settings">
      <TopBar
        back={
          // The way back depends on ?from=, which only the browser knows on a first load.
          <Suspense fallback={<BackLink href="/" label="Games" />}>
            <SettingsBack />
          </Suspense>
        }
      />

      <header className="settings-intro">
        <div className="settings-head">
          <h1 className="game-title">Settings</h1>
          <button type="button" className="btn" onClick={reset} disabled={isDefault} title="Back to the default look">
            <RestartIcon width={16} height={16} strokeWidth={2.6} />
            Reset
          </button>
        </div>
        <p className="game-blurb">Saved in this browser. Changes show up straight away.</p>
      </header>

      <section className="card section settings-look" aria-labelledby={lookId}>
        <h2 className="tape" id={lookId}>
          Look
        </h2>
        <Field label="Theme">
          <div className="tiles">
            {MODES.map(({ id, label }) => (
              <Tile
                key={id}
                label={label}
                selected={settings.mode === id}
                onSelect={() => updateSettings((s) => ({ ...s, mode: id }))}
              >
                <span className={`theme-art is-${id}`} />
              </Tile>
            ))}
          </div>
        </Field>
        <p className="settings-tip">
          Felt is the green card table. Daylight is paper and ink. Match my phone follows your phone&apos;s light or
          dark setting.
        </p>
      </section>

      {/* Knight's Tour choices are brass, like the game. */}
      <section className="card section settings-kt" data-game="knights-tour" aria-labelledby={ktId}>
        <h2 className="tape is-game" id={ktId}>
          Knight&apos;s Tour
        </h2>
        <div className="settings-preview" inert aria-hidden="true">
          <Board
            size={5}
            path={PREVIEW_PATH}
            phase="playing"
            hint={null}
            locked
            moveMs={0}
            onSquare={() => {}}
            options={kt}
          />
        </div>
        <Field label="Board">
          <div className="tiles is-two">
            {BOARD_STYLES.map(({ id, label }) => (
              <Tile key={id} label={label} selected={kt.board === id} onSelect={() => setKnightsTour({ board: id })}>
                <span className="board-swatch" data-kt-board={id}>
                  {Array.from({ length: 12 }, (_, i) => (
                    <span key={i} className={(Math.floor(i / 6) + i) % 2 ? "is-dark" : "is-light"} />
                  ))}
                </span>
              </Tile>
            ))}
          </div>
        </Field>
        <Field label="Knight">
          <div className="tiles">
            {PIECE_STYLES.map(({ id, label }) => {
              const Piece = PIECES[id];
              return (
                <Tile key={id} label={label} selected={kt.piece === id} onSelect={() => setKnightsTour({ piece: id })}>
                  <span className="knight-swatch" data-kt-board={kt.board}>
                    <Piece className="tile-piece" />
                  </span>
                </Tile>
              );
            })}
          </div>
        </Field>
        <Field label="Options" group>
          <div className="switches">
            {SWITCHES.map(({ key, label, detail }) => (
              <SwitchRow key={key} label={label} detail={detail} on={kt[key]} onToggle={() => toggle(key)} />
            ))}
          </div>
        </Field>
      </section>

      <p className="settings-note">
        <SpeakerIcon width={18} height={18} />
        <span>Imposter&apos;s sound and vibration are in its setup, under Options.</span>
      </p>
    </div>
  );
}

/** A labelled setting. */
function Field({ label, group = false, children }: { label: string; group?: boolean; children: ReactNode }) {
  const id = useId();
  return (
    <div className="field">
      <span className="field-label" id={id}>
        {label}
      </span>
      <div role={group ? "group" : "radiogroup"} aria-labelledby={id}>
        {children}
      </div>
    </div>
  );
}

/** A choice with a picture: an outlined tile, the picked one's name strip filled. */
function Tile({
  label,
  selected,
  onSelect,
  children,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
  children: ReactNode;
}) {
  return (
    <button type="button" role="radio" aria-checked={selected} className="tile" onClick={onSelect}>
      <span className="tile-art" aria-hidden="true">
        {children}
      </span>
      <span className="tile-name">
        {selected && <CheckIcon width={13} height={13} strokeWidth={3.2} />}
        {label}
      </span>
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
