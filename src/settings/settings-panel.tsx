"use client";

import { useId } from "react";

import { BOARD_STYLES, PIECE_STYLES } from "@/games/knights-tour/styles";
import { Board } from "@/games/knights-tour/ui/board";
import { PIECES } from "@/games/knights-tour/ui/knight-piece";
import { CheckIcon, MonitorIcon, MoonIcon, SunIcon } from "@/ui/icons";

import { ACCENTS, MODES, type KnightsTourSettings } from "./settings";
import { updateSettings, useSettings } from "./store";

import "@/games/knights-tour/ui/knights-tour.css";

const MODE_ICONS = { system: MonitorIcon, light: SunIcon, dark: MoonIcon };

// A few real knight jumps, so the preview shows numbers, the trail and the dots.
const PREVIEW_PATH = [0, 7, 14, 23];

export function SettingsPanel() {
  const settings = useSettings();
  const kt = settings.knightsTour;
  const setKnightsTour = (patch: Partial<KnightsTourSettings>) =>
    updateSettings((s) => ({ ...s, knightsTour: { ...s.knightsTour, ...patch } }));
  const ids = { theme: useId(), colour: useId(), board: useId(), knight: useId() };
  const accentLabel = ACCENTS.find((a) => a.id === settings.accent)?.label;

  return (
    <div className="settings">
      <h1 className="game-title">Settings</h1>
      <p className="game-blurb">Saved in this browser.</p>

      <section className="settings-section">
        <h2>Look</h2>
        <div className="setting-row">
          <span className="setting-label" id={ids.theme}>
            Theme
          </span>
          <div className="seg" role="radiogroup" aria-labelledby={ids.theme}>
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
        </div>
        <div className="setting-row">
          <span className="setting-label" id={ids.colour}>
            Colour <span className="setting-value">{accentLabel}</span>
          </span>
          <div className="swatches" role="radiogroup" aria-labelledby={ids.colour}>
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
                <CheckIcon width={16} height={16} strokeWidth={2.6} />
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="settings-section">
        <h2>Knight&apos;s Tour</h2>
        <div className="settings-preview" inert>
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

        <div className="setting-block">
          <span className="setting-label" id={ids.board}>
            Board
          </span>
          <div className="option-grid" role="radiogroup" aria-labelledby={ids.board}>
            {BOARD_STYLES.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={kt.board === id}
                className="option-card"
                onClick={() => setKnightsTour({ board: id })}
              >
                <span className="mini-board" data-kt-board={id} aria-hidden="true">
                  {Array.from({ length: 16 }, (_, i) => (
                    <span key={i} className={((i >> 2) + (i & 3)) % 2 ? "is-dark" : "is-light"} />
                  ))}
                </span>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="setting-block">
          <span className="setting-label" id={ids.knight}>
            Knight
          </span>
          <div className="option-grid" role="radiogroup" aria-labelledby={ids.knight}>
            {PIECE_STYLES.map(({ id, label }) => {
              const Piece = PIECES[id];
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={kt.piece === id}
                  className="option-card"
                  onClick={() => setKnightsTour({ piece: id })}
                >
                  <span className="option-piece" aria-hidden="true">
                    <Piece />
                  </span>
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <Toggle
          label="Move numbers"
          detail="Number each square in the order you visit it."
          checked={kt.numbers}
          onChange={(numbers) => setKnightsTour({ numbers })}
        />
        <Toggle
          label="Possible moves"
          detail="Dots on the squares the knight can jump to. Turn off for a harder game."
          checked={kt.moves}
          onChange={(moves) => setKnightsTour({ moves })}
        />
        <Toggle
          label="Trail"
          detail="A dotted line for the knight's last two jumps."
          checked={kt.trail}
          onChange={(trail) => setKnightsTour({ trail })}
        />
      </section>
    </div>
  );
}

function Toggle({
  label,
  detail,
  checked,
  onChange,
}: {
  label: string;
  detail: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="setting-row">
      <div>
        <span className="setting-label" id={id}>
          {label}
        </span>
        <span className="setting-detail">{detail}</span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={id}
        className="switch"
        onClick={() => onChange(!checked)}
      >
        <span />
      </button>
    </div>
  );
}
