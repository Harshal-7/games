"use client";

import { useEffect, useEffectEvent, useMemo, useState } from "react";

import { cryptoRandom } from "@/party/logic/random";
import { BigName, PlayHead } from "@/party/ui/parts";
import { useClock } from "@/party/ui/use-clock";
import { Confirm } from "@/ui/confirm";
import { PauseIcon, PlayIcon, SpeakerIcon } from "@/ui/icons";
import { soundBlocked } from "@/ui/sound";

import { tickTimes } from "../logic/fuse";
import { packOf } from "../logic/prompts";
import {
  canLight,
  canPass,
  lastBang,
  nextPlayer,
  settled,
  starter,
  winner,
  type Game,
  type Room,
} from "../logic/room";
import { Burst, Firecracker, Flash } from "./firecracker";
import { FlameIcon, Heart, PassIcon } from "./marks";
import { bang, fizz, fuseTick, passPop, wake } from "./sounds";
import { act } from "./use-room";

type ScreenProps = { room: Room; game: Game; names: Record<string, string> };

/** Long names step down a size or two, like BigName, so they fit a phone in one piece. */
const nameSize = (name: string) => (name.length > 13 ? " is-longer" : name.length > 9 ? " is-long" : "");

/** The bang this phone just set off (its time), so its screen flashes once and a reload doesn't. */
let freshBang: number | null = null;

/** One screen per stage: ready, the fuse burning (or paused), the bang, the winner. */
export function Play({ room, game }: { room: Room; game: Game }) {
  const props = { room, game, names: Object.fromEntries(room.players.map((p) => [p.id, p.name])) };
  if (game.stage === "ready") return <Ready key="ready" {...props} />;
  if (game.stage === "burning") {
    return game.fuse?.timer.endsAt != null ? (
      <Burning key={`burning-${game.round}`} {...props} />
    ) : (
      <Paused key={`paused-${game.round}`} {...props} />
    );
  }
  return winner(game) ? <Won key={`won-${game.bangAt}`} {...props} /> : <Bang key={`bang-${game.round}`} {...props} />;
}

/** Lights the next fuse, on the tap that also wakes the phone's sound for the ticks. */
function light(room: Room, game: Game) {
  const now = Date.now();
  if (!canLight(game, now)) return;
  if (room.options.sound) {
    wake();
    fizz();
  }
  act({ type: "light", rng: cryptoRandom, now });
}

/** A new game: who starts, then Light it. */
function Ready({ room, game, names }: ScreenProps) {
  const first = names[game.holder];
  return (
    <div className="party-play">
      <PlayHead round={1} label={`${game.seats.length} players`} />
      <div className="party-stage pk-ready">
        <Firecracker lit={false} className="pk-cracker-big" />
        <p className="pk-kicker">Pass the phone to</p>
        <BigName name={first} />
        <p className="party-help">
          {first} lights the fuse, reads the prompt out and says the first answer. Then pass it on.
        </p>
        <button type="button" className="btn btn-primary btn-big pk-light" onClick={() => light(room, game)}>
          Light it
          <FlameIcon width={22} height={22} />
        </button>
      </div>
      <Lives room={room} game={game} names={names} />
      <EndGame />
    </div>
  );
}

/** The fuse is burning: whose turn, the prompt, and one big Pass. Nothing here shows the time left. */
function Burning({ room, game, names }: ScreenProps) {
  const { sound, english } = room.options;
  const from = game.prompt ? packOf(game.prompt) : null;
  useFuse(room, game);
  usePauseWhenAway();
  const [muted, retry] = useMuted(sound);

  const pass = () => {
    const now = Date.now();
    if (!canPass(game, now)) return;
    if (sound) {
      wake();
      passPop();
    }
    act({ type: "pass", now });
  };

  return (
    <div className="party-play pk-play">
      <PlayHead round={game.round} label={english ? "English only" : "Any language"} />
      <div className="party-stage pk-stage">
        <Firecracker lit className="pk-cracker-small" />
        <p className={`pk-holder${nameSize(names[game.holder])}`} aria-live="polite">
          <span key={game.holder} className="pk-holder-name">
            {names[game.holder]}
          </span>
        </p>
        <div className="card pk-prompt">
          {from && (
            <span className="tape is-game">
              <span aria-hidden="true">{from.emoji}</span> {from.label}
            </span>
          )}
          <span className="pk-prompt-text">{game.prompt}</span>
        </div>
        <p className="pk-rule">Say one out loud, then pass. No repeats this round.</p>
      </div>
      {muted && (
        <button type="button" className="btn pk-small pk-muted" onClick={retry}>
          <SpeakerIcon width={16} height={16} />
          No sound? Tap here
        </button>
      )}
      <button type="button" className="btn btn-primary pk-pass" onClick={pass}>
        <span className="pk-pass-word">
          Pass
          <PassIcon width={30} height={30} strokeWidth={2.8} />
        </span>
        <span className="pk-pass-to">to {names[nextPlayer(game, game.holder)]}</span>
      </button>
      <div className="party-foot">
        <button type="button" className="btn pk-small" onClick={() => act({ type: "pause", now: Date.now() })}>
          <PauseIcon width={16} height={16} />
          Pause
        </button>
      </div>
    </div>
  );
}

/**
 * Ticks while the fuse burns and sets off the bang when it runs out, off its deadline:
 * each wait is worked out from the clock again, so a slow phone never drifts.
 */
function useFuse(room: Room, game: Game) {
  const fuse = game.fuse!;
  const { length, hurry } = fuse;
  const { endsAt } = fuse.timer;
  const times = useMemo(() => tickTimes({ length, hurry }), [length, hurry]);

  const onTick = useEffectEvent((count: number, hurried: boolean) => {
    if (room.options.sound) fuseTick(count, hurried);
  });
  const onEnd = useEffectEvent(() => {
    const now = Date.now();
    freshBang = now;
    if (room.options.sound) bang(lastBang(game));
    act({ type: "bang", now });
  });

  useEffect(() => {
    if (endsAt === null) return;
    // The first tick still to come (they run from the most time left down).
    let next = times.findIndex((t) => t < endsAt - Date.now());
    if (next < 0) next = times.length;
    let timeout = 0;
    const run = () => {
      const left = endsAt - Date.now();
      if (left <= 0) return onEnd();
      if (next < times.length && times[next] >= left) {
        onTick(next, times[next] <= hurry);
        // One tick at most if the phone lagged, never a burst of them.
        while (next < times.length && times[next] >= left) next++;
      }
      timeout = window.setTimeout(run, next < times.length ? left - times[next] : left);
    };
    run();
    return () => window.clearTimeout(timeout);
  }, [endsAt, times, hurry]);
}

/** How many burning screens are showing, so leaving the page pauses the fuse but a remount doesn't. */
let burningOnScreen = 0;

/** Locking the phone, switching apps or leaving the page (Settings, the games list) pauses the fuse. */
function usePauseWhenAway() {
  useEffect(() => {
    const pause = () => act({ type: "pause", now: Date.now() });
    const onVisibility = () => {
      if (document.visibilityState === "hidden") pause();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", pause);
    burningOnScreen++;
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", pause);
      burningOnScreen--;
      // Not straight away: React's development check unmounts and mounts the screen again
      // within the same task, and that mustn't pause it.
      window.setTimeout(() => {
        if (burningOnScreen === 0) pause();
      }, 0);
    };
  }, []);
}

/** Whether the phone has stopped playing the game's sound (a call, another app), and a tap to try again. */
function useMuted(sound: boolean): [boolean, () => void] {
  const [muted, setMuted] = useState(false);
  useEffect(() => {
    if (!sound) return;
    const check = () => setMuted(soundBlocked());
    const first = window.setTimeout(check, 800);
    const every = window.setInterval(check, 3_000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(every);
    };
  }, [sound]);
  const retry = () => {
    wake();
    window.setTimeout(() => setMuted(soundBlocked()), 300);
  };
  return [muted, retry];
}

/** Paused: the phone was locked or put away. The prompt stays hidden until it carries on. */
function Paused({ room, game, names }: ScreenProps) {
  const resume = () => {
    const now = Date.now();
    if (room.options.sound) wake();
    // Paused just as it ran out: it goes off now.
    if ((game.fuse?.timer.left ?? 0) <= 0) {
      freshBang = now;
      if (room.options.sound) bang(lastBang(game));
    }
    act({ type: "resume", now });
  };
  return (
    <div className="party-play">
      <PlayHead round={game.round} label="Paused" />
      <div className="party-stage pk-paused">
        <Firecracker lit={false} className="pk-cracker-big" />
        <h2 className="party-title is-big">Paused</h2>
        <p className="party-help">
          {names[game.holder]} has the phone. The fuse carries on from where it stopped.
        </p>
        <button type="button" className="btn btn-primary btn-big pk-light" onClick={resume}>
          <PlayIcon width={20} height={20} />
          Resume
        </button>
      </div>
      <EndGame />
    </div>
  );
}

function passesLine(passes: number): string {
  if (passes === 0) return "Nobody even passed it.";
  return passes === 1 ? "It was passed once." : `It was passed ${passes} times.`;
}

/** Bang: who lost a life, everyone's lives, and the next round. */
function Bang({ room, game, names }: ScreenProps) {
  const [flash] = useState(() => freshBang === game.bangAt);
  const now = useClock();
  const loser = names[game.holder];
  const out = (game.lives[game.holder] ?? 0) === 0;
  const first = names[starter(game)];
  const round = game.round + 1;

  return (
    <div className="party-play">
      {flash && <Flash />}
      <PlayHead round={game.round} label={out ? "Out" : "Bang"} />
      <div className="party-stage pk-bang">
        <Burst />
        <BigName name={loser} />
        <p className="pk-loss">{out ? "is out of the game" : "loses a life"}</p>
        <p className="party-help">{passesLine(game.passes)}</p>
      </div>
      <Lives room={room} game={game} names={names} hit={game.holder} />
      <div className="pk-next">
        <p className="pk-next-line">
          {out ? (
            <>
              <strong>{first}</strong> starts round {round}. Pass the phone over.
            </>
          ) : (
            <>
              <strong>{first}</strong> starts round {round}.
            </>
          )}
        </p>
        <button
          type="button"
          className="btn btn-primary btn-big pk-light"
          disabled={!canLight(game, now)}
          onClick={() => light(room, game)}
        >
          Light round {round}
          <FlameIcon width={22} height={22} />
        </button>
      </div>
      <EndGame />
    </div>
  );
}

/** The last one standing: their win, and everyone's wins in this room. */
function Won({ room, game, names }: ScreenProps) {
  const [flash] = useState(() => freshBang === game.bangAt);
  const now = useClock();
  const champ = winner(game)!;
  const table = game.seats
    .map((id, seat) => ({ id, seat, wins: room.wins[id] ?? 0 }))
    .sort((a, b) => b.wins - a.wins || a.seat - b.seat);
  const place = (wins: number) => table.findIndex((row) => row.wins === wins) + 1;

  return (
    <div className="party-play">
      {flash && <Flash />}
      <PlayHead round={game.round} label="Game over" />
      <div className="pk-won">
        <Burst />
        <p className="pk-won-out">
          {names[game.holder]} is out after {game.round} {game.round === 1 ? "round" : "rounds"}.
        </p>
        <span className="pk-badge">Last one standing</span>
        <h2 className="pk-headline">{names[champ]} wins!</h2>
      </div>

      <section className="card pk-wins" aria-labelledby="pk-wins-title">
        <div className="pk-wins-head">
          <h3 className="label" id="pk-wins-title">
            Wins
          </h3>
          <span>
            after {room.played} {room.played === 1 ? "game" : "games"}
          </span>
        </div>
        <ol>
          {table.map(({ id, wins }) => (
            <li key={id}>
              <span className="pk-rank" aria-hidden="true">
                {place(wins)}
              </span>
              <span className="pk-wins-name">{names[id]}</span>
              <span className="pk-wins-end">
                {id === champ && <span className="pk-gain">+1</span>}
                <span className="pk-total">
                  {wins}
                  <span className="party-visually-hidden"> {wins === 1 ? "win" : "wins"}</span>
                </span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <div className="pk-pair">
        <button type="button" className="btn" onClick={() => act({ type: "lobby" })}>
          Players &amp; options
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!settled(game, now)}
          onClick={() => act({ type: "start", rng: cryptoRandom })}
        >
          Play again
        </button>
      </div>
    </div>
  );
}

/** Everyone's lives, in passing order: hearts left, and who's out. */
function Lives({ room, game, names, hit }: ScreenProps & { hit?: string }) {
  const full = Math.max(room.options.lives, ...Object.values(game.lives));
  return (
    <ul className="pk-lives" aria-label="Lives left">
      {game.seats.map((id) => {
        const lives = game.lives[id] ?? 0;
        return (
          <li key={id} className="pk-life" data-out={lives === 0} data-hit={id === hit}>
            <span className="pk-life-name">{names[id]}</span>
            <span className="pk-hearts">
              {Array.from({ length: full }, (_, i) => (
                <Heart key={i} full={i < lives} />
              ))}
            </span>
            <span className="party-visually-hidden">
              {lives === 0 ? ", out" : `, ${lives} ${lives === 1 ? "life" : "lives"} left`}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** The way out of a game: ends it for nobody, after asking. */
function EndGame() {
  const [asking, setAsking] = useState(false);
  if (asking) {
    return (
      <Confirm
        title="End this game?"
        detail="Nobody wins it. Back to players and options."
        yes="End game"
        onNo={() => setAsking(false)}
        onYes={() => act({ type: "lobby" })}
      />
    );
  }
  return (
    <div className="party-foot">
      <button type="button" className="btn pk-small" onClick={() => setAsking(true)}>
        End game
      </button>
    </div>
  );
}
