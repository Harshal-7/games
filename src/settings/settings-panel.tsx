"use client";

import { useId, type ReactNode } from "react";

import { BOARD_STYLES, PIECE_STYLES } from "@/games/knights-tour/styles";
import { Board } from "@/games/knights-tour/ui/board";
import { cue } from "@/games/knights-tour/ui/feedback";
import { PIECES } from "@/games/knights-tour/ui/knight-piece";
import { BackButton } from "@/ui/back-button";
import { CheckIcon, MonitorIcon, MoonIcon, RestartIcon, SunIcon } from "@/ui/icons";
import { TopBar } from "@/ui/top-bar";

import { ACCENTS, DEFAULT_SETTINGS, MODES, type KnightsTourSettings, type Settings } from "./settings";
import { updateSettings, useSettings } from "./store";

import "@/games/knights-tour/ui/knights-tour.css";

const MODE_ICONS = { system: MonitorIcon, light: SunIcon, dark: MoonIcon };

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
  const setKnightsTour = (patch: Partial<KnightsTourSettings>) =>
    updateSettings((s) => ({ ...s, knightsTour: { ...s.knightsTour, ...patch } }));
  const isDefault = JSON.stringify(withoutSize(settings)) === JSON.stringify(DEFAULT_SETTINGS);
  const reset = () =>
    updateSettings((s) => ({
      ...DEFAULT_SETTINGS,
      knightsTour: { ...DEFAULT_SETTINGS.knightsTour, size: s.knightsTour.size },
    }));
  const accentLabel = ACCENTS.find((a) => a.id === settings.accent)?.label;

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
        back={<BackButton label="Knight's Tour" fallback="/knights-tour" />}
        actions={
          <button type="button" className="btn" onClick={reset} disabled={isDefault} title="Back to the default look">
            <RestartIcon width={16} height={16} />
            Reset
          </button>
        }
      />

      <div className="settings-intro">
        <h1 className="game-title">Settings</h1>
        <p className="game-blurb">Saved in this browser. Changes show up straight away.</p>
      </div>

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

      <section className="settings-card settings-look">
        <h2>Look</h2>
        <Field label="Theme" inline>
          <div className="seg">
            {MODES.map(({ id, label }) => {
              const Icon = MODE_ICONS[id];
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={settings.mode === id}
                  onClick={() => updateSettings((s) => ({ ...s, mode: id }))}
                >
                  <Icon width={15} height={15} />
                  {label}
                </button>
              );
            })}
          </div>
        </Field>
        <Field label="Colour" note={accentLabel} inline>
          <div className="swatches">
            {ACCENTS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={settings.accent === id}
                aria-label={label}
                title={label}
                data-accent={id}
                className="swatch"
                onClick={() => updateSettings((s) => ({ ...s, accent: id }))}
              >
                <CheckIcon width={15} height={15} strokeWidth={2.8} />
              </button>
            ))}
          </div>
        </Field>
      </section>

      <section className="settings-card settings-kt">
        <h2>Knight&apos;s Tour</h2>
        <Field label="Board">
          <div className="tiles">
            {BOARD_STYLES.map(({ id, label }) => (
              <Tile key={id} label={label} selected={kt.board === id} onSelect={() => setKnightsTour({ board: id })}>
                <span className="mini-board" data-kt-board={id}>
                  {Array.from({ length: 16 }, (_, i) => (
                    <span key={i} className={((i >> 2) + (i & 3)) % 2 ? "is-dark" : "is-light"} />
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
                  <Piece className="tile-piece" />
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
    </div>
  );
}

/** A labelled setting. `inline` puts the label beside the choices instead of above. */
function Field({
  label,
  note,
  inline = false,
  group = false,
  children,
}: {
  label: string;
  note?: string;
  inline?: boolean;
  group?: boolean;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <div className={inline ? "field is-inline" : "field"}>
      <span className="field-label" id={id}>
        {label}
        {note && <span className="field-note">{note}</span>}
      </span>
      <div role={group ? "group" : "radiogroup"} aria-labelledby={id}>
        {children}
      </div>
    </div>
  );
}

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
      <span className="tile-name">{label}</span>
      <span className="tile-check" aria-hidden="true">
        <CheckIcon width={11} height={11} strokeWidth={3.2} />
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
