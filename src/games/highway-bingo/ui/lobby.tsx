"use client";

import { useId, useState, type ReactNode } from "react";

import { cryptoRandom } from "@/party/logic/random";

import { MIX } from "../logic/card";
import { currentEdition, SIZES } from "../logic/code";
import type { Options, Room } from "../logic/room";
import { CheckCard } from "./check";
import { CodeForm } from "./code-form";
import { CheckCardIcon, ChevronDownIcon, JoinIcon, Milestone, WheelIcon } from "./marks";
import { act } from "./use-room";

/** Between games: start a shared game, join one, play on one phone, or check a card. */
export function Lobby({ room }: { room: Room }) {
  const [screen, setScreen] = useState<"home" | "join" | "check">("home");
  const [checked, setChecked] = useState<{ code: string; seat: number } | null>(null);
  const home = () => {
    setScreen("home");
    setChecked(null);
  };

  if (screen === "join") {
    return <CodeForm purpose="join" onCancel={home} onDone={(code, seat) => act({ type: "join", code, seat })} />;
  }
  if (screen === "check") {
    return checked ? (
      <CheckCard
        code={checked.code}
        seat={checked.seat}
        onSeat={(seat) => setChecked({ ...checked, seat })}
        onDone={home}
      />
    ) : (
      <CodeForm purpose="check" onCancel={home} onDone={(code, seat) => setChecked({ code, seat })} />
    );
  }

  const sights = currentEdition("highway").sights.length;

  return (
    <div className="hb-lobby">
      <header className="hb-intro">
        <div className="hb-title-card">
          <Milestone className="hb-title-stone" />
          <div className="hb-title-plate">
            <h1 className="hb-title-name">Highway Bingo</h1>
            <span className="hb-title-meta">2+ players · own phones or one</span>
          </div>
        </div>
        <p className="game-blurb hb-blurb">
          Bingo cards of things you see on Indian roads: a Horn OK Please truck, nimbu-mirchi, a cow on the divider.
          Spot one, tap it. The first full line wins.
        </p>
        <p className="hb-note">
          <WheelIcon width={20} height={20} />
          <span>Driver? Call it out, someone else taps.</span>
        </p>
      </header>

      <section className="card section hb-own" aria-labelledby="hb-own-title">
        <h2 className="tape" id="hb-own-title">
          Everyone on their own phone
        </h2>
        <p className="hb-section-text">
          One phone starts and gets a code. Everyone else taps Join and types it with their seat number, and each seat
          gets its own card. Nothing is sent anywhere, so it works with no signal.
        </p>
        <div className="hb-own-actions">
          <button
            type="button"
            className="btn btn-primary btn-big"
            onClick={() => act({ type: "start", mode: "own", rng: cryptoRandom })}
          >
            Start a game
          </button>
          <div className="hb-own-more">
            <button type="button" className="btn" onClick={() => setScreen("join")}>
              <JoinIcon width={18} height={18} />
              Join with a code
            </button>
            <button type="button" className="btn" onClick={() => setScreen("check")}>
              <CheckCardIcon width={18} height={18} />
              Check a card
            </button>
          </div>
        </div>
      </section>

      <section className="card section hb-one" aria-labelledby="hb-one-title">
        <h2 className="tape" id="hb-one-title">
          One phone
        </h2>
        <div className="hb-one-choices">
          <button
            type="button"
            className="hb-choice"
            onClick={() => act({ type: "start", mode: "sides", rng: cryptoRandom })}
          >
            <span className="hb-choice-art" aria-hidden="true">
              ◀▶
            </span>
            <span className="hb-choice-text">
              <b>Left against right</b>
              <span>Two cards. Each side only counts what&apos;s out of its own windows.</span>
            </span>
          </button>
          <button
            type="button"
            className="hb-choice"
            onClick={() => act({ type: "start", mode: "together", rng: cryptoRandom })}
          >
            <span className="hb-choice-art" aria-hidden="true">
              🚗
            </span>
            <span className="hb-choice-text">
              <b>One card together</b>
              <span>The whole car plays one card. Good with kids.</span>
            </span>
          </button>
        </div>
      </section>

      <OptionsCard options={room.options} sights={sights} />

      <details className="hb-rules">
        <summary className="btn">
          How to play
          <ChevronDownIcon className="hb-rules-chevron" />
        </summary>
        <div className="card hb-rules-body">
          <ol>
            <li>Everyone gets a card of road sights: some easy, some not so easy, a few rare. Every card has the same mix.</li>
            <li>Spot one out of the window? Tap it to stamp it. Tapped by mistake? Tap again to take it off.</li>
            <li>The first full line wins: a row, a column or a diagonal. On 5×5 the middle square is free.</li>
            <li>
              Shout &ldquo;Bingo!&rdquo; and show your screen. It shows your code and seat, so anyone can open the same
              card with Check a card. Or play on to a full card.
            </li>
          </ol>
          <p>
            Fair play: you have to see it yourself, and one truck counts once. Anyone can type any seat, so it runs on
            trust, and two phones on the same seat get the same card.
          </p>
        </div>
      </details>
    </div>
  );
}

function OptionsCard({ options, sights }: { options: Options; sights: number }) {
  const set = (patch: Partial<Options>) => act({ type: "options", patch });
  const mix = MIX[options.size];
  return (
    <section className="card section hb-options" aria-labelledby="hb-options-title">
      <h2 className="tape is-game" id="hb-options-title">
        Options
      </h2>

      <Choice
        label="Card"
        note={
          options.size === 5
            ? `5×5 with a free middle: ${mix.easy} easy, ${mix.medium} medium and ${mix.rare} rare sights from ${sights}.`
            : `4×4 for short drives: ${mix.easy} easy, ${mix.medium} medium and ${mix.rare} rare sights from ${sights}.`
        }
      >
        {SIZES.map((size) => (
          <button
            key={size}
            type="button"
            role="radio"
            aria-checked={options.size === size}
            onClick={() => set({ size })}
          >
            {size}×{size}
            <span className="hb-seg-note">{size === 5 ? "Free middle" : "Short drive"}</span>
          </button>
        ))}
      </Choice>
      <p className="hb-field-note">Joining takes the size from the code.</p>

      <div className="switches hb-switches">
        <Switch
          label="Sound and buzz"
          detail="A stamp when you mark a square, a fanfare for a bingo, with a buzz on Android."
          on={options.sound}
          onChange={(sound) => set({ sound })}
        />
        <Switch
          label="Keep the screen on"
          detail="While a card is open, so it's ready when something goes past. Uses more battery."
          on={options.awake}
          onChange={(awake) => set({ awake })}
        />
      </div>
    </section>
  );
}

function Choice({ label, note, children }: { label: string; note: string; children: ReactNode }) {
  const id = useId();
  return (
    <div className="hb-field">
      <span className="field-label" id={id}>
        {label}
      </span>
      <div className="seg hb-seg" role="radiogroup" aria-labelledby={id}>
        {children}
      </div>
      <p className="hb-field-note">{note}</p>
    </div>
  );
}

function Switch({
  label,
  detail,
  on,
  onChange,
}: {
  label: string;
  detail: string;
  on: boolean;
  onChange: (on: boolean) => void;
}) {
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
        onClick={() => onChange(!on)}
      >
        <span />
      </button>
    </div>
  );
}
