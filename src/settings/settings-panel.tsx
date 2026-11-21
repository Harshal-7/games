"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useId, type ReactNode } from "react";

import { dial } from "@/games/crack-the-code/ui/sounds";
import { setOptions as setCrackOptions, useOptions as useCrackOptions } from "@/games/crack-the-code/ui/stores";
import { setOptions as setPickerOptions, useOptions as usePickerOptions } from "@/games/finger-picker/ui/use-options";
import { lineSound } from "@/games/no-lift/ui/sounds";
import { setOptions as setNoLiftOptions, useOptions as useNoLiftOptions } from "@/games/no-lift/ui/stores";
import { BOARD_STYLES, PIECE_STYLES } from "@/games/knights-tour/styles";
import { Board } from "@/games/knights-tour/ui/board";
import { cue } from "@/games/knights-tour/ui/feedback";
import { PIECES } from "@/games/knights-tour/ui/knight-piece";
import { flick } from "@/games/make-24/ui/sounds";
import { setOptions as setMake24Options, useOptions as useMake24Options } from "@/games/make-24/ui/stores";
import { clack } from "@/games/marble-solitaire/ui/sounds";
import { setOptions as setMarbleOptions, useOptions as useMarbleOptions } from "@/games/marble-solitaire/ui/stores";
import type { GameSlug } from "@/games/slugs";
import { CheckIcon, RestartIcon, SpeakerIcon } from "@/ui/icons";
import { TopBar } from "@/ui/top-bar";

import { backTarget, fromGame } from "./back-target";
import { DEFAULT_SETTINGS, THEMES, type KnightsTourSettings, type Settings } from "./settings";
import { BackLink } from "./settings-back";
import { updateSettings, useSettings } from "./store";
import { tableById } from "./tables";

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

/**
 * Each game's own part of Settings. It shows only when you open Settings from that game,
 * so Home and the other games never list it.
 */
const GAME_SECTIONS: Record<GameSlug, () => ReactNode> = {
  "knights-tour": KnightsTourSection,
  imposter: ImposterNote,
  mafia: MafiaNote,
  patakha: PatakhaNote,
  "highway-bingo": HighwayBingoNote,
  ulta: UltaNote,
  "no-lift": NoLiftSection,
  "finger-picker": FingerPickerSection,
  "marble-solitaire": MarbleSolitaireSection,
  "crack-the-code": CrackTheCodeSection,
  "make-24": Make24Section,
};

/**
 * What Reset puts back: the look, plus the game section on screen. The remembered board
 * size isn't on this page, so it never counts as a change and Reset leaves it alone.
 */
function resettable(s: Settings, game: GameSlug | null) {
  const look = { theme: s.theme, matchPhone: s.matchPhone };
  if (game !== "knights-tour") return look;
  return { ...look, knightsTour: { ...s.knightsTour, size: DEFAULT_SETTINGS.knightsTour.size } };
}

export function SettingsPanel() {
  // Which game you came from is in ?from=, which only the browser knows on a first load:
  // until then the page shows the look and goes back to the games list.
  return (
    <Suspense fallback={<SettingsView game={null} />}>
      <SettingsFromLink />
    </Suspense>
  );
}

function SettingsFromLink() {
  return <SettingsView game={fromGame(useSearchParams().get("from"))} />;
}

function SettingsView({ game }: { game: GameSlug | null }) {
  const settings = useSettings();
  const lookId = useId();
  const GameSection = game ? GAME_SECTIONS[game] : null;
  const isDefault = JSON.stringify(resettable(settings, game)) === JSON.stringify(resettable(DEFAULT_SETTINGS, game));
  const reset = () =>
    updateSettings((s) => ({
      ...s,
      theme: DEFAULT_SETTINGS.theme,
      matchPhone: DEFAULT_SETTINGS.matchPhone,
      knightsTour:
        game === "knights-tour" ? { ...DEFAULT_SETTINGS.knightsTour, size: s.knightsTour.size } : s.knightsTour,
    }));

  return (
    <div className="settings">
      <TopBar back={<BackLink {...backTarget(game)} />} />

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
          <div className="tiles is-themes">
            {THEMES.map(({ id, label }) => (
              <Tile
                key={id}
                label={label}
                selected={settings.theme === id}
                onSelect={() => updateSettings((s) => ({ ...s, theme: id }))}
              >
                {id === "game" ? (
                  <span className="theme-art is-own" />
                ) : (
                  // The tile wears the table's own page colours (its data-table block).
                  <span className={`theme-art is-${tableById(id).tone}`} data-table={id} />
                )}
              </Tile>
            ))}
          </div>
        </Field>
        <p className="settings-tip">
          Each game&apos;s own: every game sits on its own table colour. Pick any other to use it everywhere.
        </p>
        <div className="switches settings-match">
          <SwitchRow
            label="Match my phone"
            detail="Daylight whenever your phone is in light mode"
            on={settings.matchPhone}
            onToggle={() => updateSettings((s) => ({ ...s, matchPhone: !s.matchPhone }))}
          />
        </div>
      </section>

      {GameSection ? (
        <GameSection />
      ) : (
        <p className="settings-note">Open Settings from inside a game to change that game&apos;s options too.</p>
      )}

      <p className="settings-note settings-offline">
        Works offline after your first visit. Add it to your Home Screen for an app icon.
      </p>
    </div>
  );
}

/** Knight's Tour's board, knight and options, in brass like the game. */
function KnightsTourSection() {
  const kt = useSettings().knightsTour;
  const ktId = useId();
  const setKnightsTour = (patch: Partial<KnightsTourSettings>) =>
    updateSettings((s) => ({ ...s, knightsTour: { ...s.knightsTour, ...patch } }));

  function toggle(key: Flag) {
    const on = !kt[key];
    setKnightsTour({ [key]: on });
    // Let people hear or feel what they just switched on.
    if (on && key === "sound") cue("move", { sound: true, vibrate: false });
    if (on && key === "vibrate") cue("move", { sound: false, vibrate: true });
  }

  return (
    <section className="card section settings-game" data-game="knights-tour" aria-labelledby={ktId}>
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
      <Field label="Board" wide>
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
  );
}

/** The Finger picker has no setup screen, so its Sound switch lives here. */
function FingerPickerSection() {
  const { sound } = usePickerOptions();
  const id = useId();
  return (
    <section className="card section settings-game" data-game="finger-picker" aria-labelledby={id}>
      <h2 className="tape is-game" id={id}>
        Finger picker
      </h2>
      <Field label="Options" group>
        <div className="switches">
          <SwitchRow
            label="Sound and vibration"
            detail="A tick each second of the count, and a chime for the pick"
            on={sound}
            onToggle={() => setPickerOptions({ sound: !sound })}
          />
        </div>
      </Field>
    </section>
  );
}

/** No Lift has no setup screen, so its Sound switch lives here. */
function NoLiftSection() {
  const { sound } = useNoLiftOptions();
  const id = useId();
  function toggle() {
    setNoLiftOptions({ sound: !sound });
    // Let people hear what they just switched on.
    if (!sound) lineSound(1, 4);
  }
  return (
    <section className="card section settings-game" data-game="no-lift" aria-labelledby={id}>
      <h2 className="tape is-game" id={id}>
        No Lift
      </h2>
      <Field label="Options" group>
        <div className="switches">
          <SwitchRow label="Sound and vibration" detail="A soft note for each line, a tune at the end" on={sound} onToggle={toggle} />
        </div>
      </Field>
    </section>
  );
}

function MarbleSolitaireSection() {
  const { sound } = useMarbleOptions();
  const id = useId();
  function toggle() {
    setMarbleOptions({ sound: !sound });
    // Let people hear what they just switched on.
    if (!sound) clack();
  }
  return (
    <section className="card section settings-game" data-game="marble-solitaire" aria-labelledby={id}>
      <h2 className="tape is-game" id={id}>
        Marble solitaire
      </h2>
      <Field label="Options" group>
        <div className="switches">
          <SwitchRow label="Sound" detail="A soft clack on each jump, and a chime at the end" on={sound} onToggle={toggle} />
        </div>
      </Field>
    </section>
  );
}

function CrackTheCodeSection() {
  const { sound } = useCrackOptions();
  const id = useId();
  function toggle() {
    setCrackOptions({ sound: !sound });
    // Let people hear what they just switched on.
    if (!sound) dial();
  }
  return (
    <section className="card section settings-game" data-game="crack-the-code" aria-labelledby={id}>
      <h2 className="tape is-game" id={id}>
        Crack the code
      </h2>
      <Field label="Options" group>
        <div className="switches">
          <SwitchRow label="Sound" detail="A click for each guess, and a few notes at the end" on={sound} onToggle={toggle} />
        </div>
      </Field>
    </section>
  );
}

function Make24Section() {
  const { sound } = useMake24Options();
  const id = useId();
  function toggle() {
    setMake24Options({ sound: !sound });
    // Let people hear what they just switched on.
    if (!sound) flick();
  }
  return (
    <section className="card section settings-game" data-game="make-24" aria-labelledby={id}>
      <h2 className="tape is-game" id={id}>
        Make 24
      </h2>
      <Field label="Options" group>
        <div className="switches">
          <SwitchRow label="Sound" detail="A flick as two cards become one, and a few notes for 24" on={sound} onToggle={toggle} />
        </div>
      </Field>
    </section>
  );
}

/** Imposter keeps its options with the room, in its setup screen. */
function ImposterNote() {
  return (
    <p className="settings-note">
      <SpeakerIcon width={18} height={18} />
      <span>Imposter&apos;s sound and vibration are in its setup, under Options.</span>
    </p>
  );
}

/** Mafia keeps its options with the room too. */
function MafiaNote() {
  return (
    <p className="settings-note">
      <SpeakerIcon width={18} height={18} />
      <span>Mafia&apos;s narrator voice, sound and roles are in its setup, under Options.</span>
    </p>
  );
}

/** Patakha keeps its options with the room, in its setup screen. */
function PatakhaNote() {
  return (
    <p className="settings-note">
      <SpeakerIcon width={18} height={18} />
      <span>Patakha&apos;s sound, lives and fuse length are in its setup, under Options.</span>
    </p>
  );
}

/** Highway Bingo keeps its options on this phone, in its setup screen. */
function HighwayBingoNote() {
  return (
    <p className="settings-note">
      <SpeakerIcon width={18} height={18} />
      <span>Highway Bingo&apos;s card size, sound and screen options are in its setup, under Options.</span>
    </p>
  );
}

/** Ulta keeps its options with the room, in its setup screen. */
function UltaNote() {
  return (
    <p className="settings-note">
      <SpeakerIcon width={18} height={18} />
      <span>Ulta&apos;s sound and target score are in its setup, under Options.</span>
    </p>
  );
}

/** A labelled setting. */
function Field({
  label,
  group = false,
  wide = false,
  children,
}: {
  label: string;
  group?: boolean;
  /** Spans the whole game card on big screens. */
  wide?: boolean;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <div className={wide ? "field is-wide" : "field"}>
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
