"use client";

import { useId, useState, type ReactNode } from "react";

import { cryptoRandom } from "@/party/logic/random";

import { SIZES } from "../logic/code";
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

  return (
    <div className="hb-lobby">
      <header className="hb-intro">
        <div className="hb-title-card">
          <Milestone className="hb-title-stone" />
          <div className="hb-title-plate">
            <h1 className="hb-title-name">Highway Bingo</h1>
            <span className="hb-title-meta">2+ players · road trips</span>
          </div>
        </div>
        <p className="game-blurb hb-blurb">Spot it out the window, tap it. First full line wins.</p>
        <p className="hb-note">
          <WheelIcon width={20} height={20} />
          <span>Driver? Just call it out.</span>
        </p>
      </header>

      <section className="card section hb-own" aria-labelledby="hb-own-title">
        <h2 className="tape" id="hb-own-title">
          Own phones
        </h2>
        <p className="hb-section-text">One code, a card each. No signal needed.</p>
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
              <span>A card for each side of the car.</span>
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
              <span>The whole car shares one card.</span>
            </span>
          </button>
        </div>
      </section>

      <OptionsCard options={room.options} />

      <details className="hb-rules">
        <summary className="btn">
          How to play
          <ChevronDownIcon className="hb-rules-chevron" />
        </summary>
        <div className="card hb-rules-body">
          <ol>
            <li>
              One phone taps Start and shows a code. Everyone else taps Join and types it with a seat number: 2, 3, 4…
            </li>
            <li>Spot something on your card? Tap it. Tap again to undo.</li>
            <li>First full line wins: across, down or diagonal. On 5×5 the middle is free.</li>
            <li>Shout &ldquo;Bingo!&rdquo; and show your screen. Anyone can check it with Check a card.</li>
          </ol>
          <p>
            Every card has the same mix of easy and rare sights. You have to see it yourself, and one truck counts once.
            Works with no signal once the game has been opened.
          </p>
        </div>
      </details>
    </div>
  );
}

function OptionsCard({ options }: { options: Options }) {
  const set = (patch: Partial<Options>) => act({ type: "options", patch });
  return (
    <section className="card section hb-options" aria-labelledby="hb-options-title">
      <h2 className="tape is-game" id="hb-options-title">
        Options
      </h2>

      <Choice label="Card">
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

      <div className="switches hb-switches">
        <Switch
          label="Sound and buzz"
          detail="A stamp on each tap, a fanfare for bingo."
          on={options.sound}
          onChange={(sound) => set({ sound })}
        />
        <Switch
          label="Keep the screen on"
          detail="While a card is open. Uses more battery."
          on={options.awake}
          onChange={(awake) => set({ awake })}
        />
      </div>
    </section>
  );
}

function Choice({ label, children }: { label: string; children: ReactNode }) {
  const id = useId();
  return (
    <div className="hb-field">
      <span className="field-label" id={id}>
        {label}
      </span>
      <div className="seg hb-seg" role="radiogroup" aria-labelledby={id}>
        {children}
      </div>
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
