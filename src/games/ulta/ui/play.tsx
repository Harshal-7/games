"use client";

import { useEffect, useLayoutEffect, useState } from "react";

import { cryptoRandom } from "@/party/logic/random";
import { timeLeft } from "@/party/logic/timer";
import { Face, HoldCard } from "@/party/ui/hold-card";
import { BigName, PlayHead, Stamp } from "@/party/ui/parts";
import { RingTimer } from "@/party/ui/ring-timer";
import { useClock } from "@/party/ui/use-clock";
import { Confirm } from "@/ui/confirm";

import { checkTake, type Clip } from "../logic/audio";
import {
  COPY_EXTRA_S,
  COPY_MIN_S,
  GUESS_MS,
  LISTENS,
  other,
  SING_MAX_S,
  SING_MIN_S,
  TEAM_IDS,
  TEAM_NAMES,
  winner,
  type Game,
  type Room,
  type TeamId,
} from "../logic/room";
import { HoldMic } from "./hold-mic";
import { BackwardsIcon, ForwardsIcon, MicIcon } from "./marks";
import type { MicError } from "./mic";
import { MicTrouble } from "./mic-help";
import { playClips, stopPlaying } from "./player";
import { cheer, shrug } from "./sounds";
import { dropTakes, keepTake, takesFor, useTakes, type Take } from "./takes";
import { act } from "./use-room";

type ScreenProps = { room: Room; game: Game; names: Record<string, string> };

/** Which turn of which game the recordings in memory belong to. */
const turnKey = (game: Game) => `${game.id}:${game.turn.number}`;

/** Set when a reload lost the recordings, so the singing screen can say why it's back. */
let lostNotice = false;

/** One screen per step of a turn, and the winner at the end. */
export function Play({ room, game }: { room: Room; game: Game }) {
  const props = { room, game, names: Object.fromEntries(room.players.map((p) => [p.id, p.name])) };
  const key = `${turnKey(game)}:${game.turn.stage}`;
  // Each step starts at the top, with the round and the team in view.
  useLayoutEffect(() => {
    // Braces matter: newer browsers return a promise from scrollTo, and an effect mustn't return one.
    window.scrollTo(0, 0);
  }, [key, game.over]);
  if (game.over) return <Won key={`won-${game.id}`} {...props} />;
  switch (game.turn.stage) {
    case "pick":
      return <Pick key={key} {...props} />;
    case "sing":
      return <Sing key={key} {...props} />;
    case "copy":
      return <Copy key={key} {...props} />;
    case "guess":
      return <Guess key={key} {...props} />;
    case "steal":
      return <Steal key={key} {...props} />;
    case "reveal":
      return <Reveal key={key} {...props} />;
  }
}

/** "Team Seedha", or "everyone" when playing for fun. */
const teamName = (team: TeamId | null) => (team ? `Team ${TEAM_NAMES[team]}` : "everyone");

function Head({ game, label }: { game: Game; label?: string }) {
  const team = game.turn.team;
  return <PlayHead round={game.turn.number} label={label ?? (team ? `Team ${TEAM_NAMES[team]}` : "Just for fun")} />;
}

/** The singer picks: a song of their own, or one only they see on the hold-to-see card. */
function Pick({ room, game, names }: ScreenProps) {
  const { turn } = game;
  const singer = names[turn.singer];
  const copier = names[turn.copier];
  const guessers = turn.team ? `the rest of Team ${TEAM_NAMES[turn.team]}` : "everyone";
  return (
    <div className="party-play">
      <Head game={game} />
      <div className="party-stage is-deal ul-pick">
        <p className="ul-kicker">Pass the phone to</p>
        <BigName name={singer} />
        {turn.song ? (
          <>
            <p className="party-help">Hold the card to see your song. Keep it to yourself.</p>
            <div className="ul-card-slot">
              <HoldCard name={singer} opens={turn.opens} buzz={room.options.sound} onOpen={() => act({ type: "open-song" })}>
                <Face kicker="Sing this" word={turn.song.title} note={`from ${turn.song.from}`} />
              </HoldCard>
            </div>
          </>
        ) : (
          <p className="party-help">
            {singer} sings, {copier} copies it backwards, and {guessers} guesses. Think of a song, or let the phone
            suggest one only you can see.
          </p>
        )}
      </div>
      <div className="ul-actions">
        {turn.song ? (
          <>
            <button
              type="button"
              className="btn btn-primary btn-big"
              disabled={turn.opens === 0}
              onClick={() => act({ type: "sing" })}
            >
              {turn.opens === 0 ? "Hold the card first" : "Sing it"}
              <MicIcon width={22} height={22} />
            </button>
            <div className="ul-pair">
              <button type="button" className="btn" onClick={() => act({ type: "suggest", rng: cryptoRandom })}>
                Another one
              </button>
              <button type="button" className="btn" onClick={() => act({ type: "own-song" })}>
                My own song
              </button>
            </div>
          </>
        ) : (
          <>
            <button
              type="button"
              className="btn btn-primary btn-big"
              onClick={() => act({ type: "suggest", rng: cryptoRandom })}
            >
              Suggest one
            </button>
            <button type="button" className="btn" onClick={() => act({ type: "own-song" })}>
              I&apos;ve got a song
            </button>
          </>
        )}
      </div>
      <Scores room={room} game={game} />
      <EndGame />
    </div>
  );
}

/** What a take turned out to be, in words, or null when it's good. */
function takeNote(clip: Clip, min: number, onGood: (clip: Clip) => void): string | null {
  const check = checkTake(clip, min);
  if (check.kind === "silent") return "Didn't hear anything. Hold the button down the whole time, close to the phone.";
  if (check.kind === "short") {
    return `That was only ${check.seconds.toFixed(1)} seconds. ${min >= SING_MIN_S ? "Sing a whole line, 4 to 8 seconds." : "Copy the whole thing."}`;
  }
  onGood(check.clip);
  return null;
}

/** The singer holds the button and sings a line. */
function Sing({ game, names }: ScreenProps) {
  const { turn } = game;
  const key = turnKey(game);
  const { original } = useTakes(key);
  const [note, setNote] = useState<string | null>(() => {
    if (!lostNotice) return null;
    lostNotice = false;
    return "The page reloaded and the recordings went with it. Sing it again.";
  });
  const [trouble, setTrouble] = useState<MicError | null>(null);
  const singer = names[turn.singer];
  const copier = names[turn.copier];

  return (
    <div className="party-play">
      <Head game={game} />
      <div className="party-stage ul-sing">
        <p className="ul-kicker">{singer} sings</p>
        <h2 className="party-title">{original ? "Got it" : "Hold and sing"}</h2>
        <p className="party-help">
          {original
            ? `${original.seconds.toFixed(1)} seconds. Happy with it? Pass the phone to ${copier}.`
            : `${turn.song ? "Your song" : "Your own song"}: a line or two, 4 to 8 seconds. Hum or la-la if the words don't come.`}
        </p>
        <div className="ul-mic-slot">
          <HoldMic
            label={original ? "Sing again" : "Hold and sing"}
            quiet={original !== null}
            maxSeconds={SING_MAX_S}
            onDone={(clip) => {
              setTrouble(null);
              setNote(takeNote(clip, SING_MIN_S, (good) => keepTake(key, "original", good)));
            }}
            onProblem={setTrouble}
          />
        </div>
        {note && <p className="ul-take-note">{note}</p>}
        {trouble && <MicTrouble problem={trouble.problem} />}
      </div>
      {original && (
        <button type="button" className="btn btn-primary btn-big" onClick={() => act({ type: "sung" })}>
          Pass to {copier}
        </button>
      )}
      <EndGame />
    </div>
  );
}

/**
 * A step that plays a recording the page no longer has (a reload lost it): back to
 * singing. Steals and reveals carry on without.
 */
function useLost(missing: boolean) {
  useEffect(() => {
    if (!missing) return;
    lostNotice = true;
    act({ type: "lost" });
  }, [missing]);
}

/** The copier hears the line backwards, up to 3 times, and records a copy. */
function Copy({ game, names }: ScreenProps) {
  const { turn } = game;
  const key = turnKey(game);
  const { original, copy } = useTakes(key);
  useLost(original === null);
  const [note, setNote] = useState<string | null>(null);
  const [trouble, setTrouble] = useState<MicError | null>(null);
  if (!original) return <div className="party-play" aria-busy="true" />;

  const singer = names[turn.singer];
  const copier = names[turn.copier];
  const left = LISTENS - turn.listens;
  const listen = () => {
    if (left <= 0) return;
    act({ type: "listen" });
    playClips([original.back]);
  };
  const playToTeam = () => {
    const take = takesFor(key).copy;
    if (!take) return;
    act({ type: "copied", now: Date.now() });
    playClips([take.back]);
  };

  return (
    <div className="party-play">
      <Head game={game} />
      <div className="party-stage ul-copy">
        <p className="ul-kicker">Pass the phone to</p>
        <BigName name={copier} />
        <p className="party-help">
          Hear {singer}&apos;s line backwards, then hold the button and copy that backwards sound as closely as you can.
        </p>
        <button type="button" className="btn ul-listen" disabled={left === 0} onClick={listen}>
          <BackwardsIcon width={18} height={18} />
          {left === 0 ? "No listens left" : "Play it backwards"}
          <span className="ul-listen-count">
            {left} of {LISTENS}
          </span>
        </button>
        <div className="ul-mic-slot">
          <HoldMic
            label={copy ? "Copy again" : "Hold and copy"}
            quiet={copy !== null}
            disabled={turn.listens === 0}
            maxSeconds={Math.ceil(original.seconds + COPY_EXTRA_S)}
            onDone={(clip) => {
              setTrouble(null);
              setNote(takeNote(clip, COPY_MIN_S, (good) => keepTake(key, "copy", good)));
            }}
            onProblem={setTrouble}
          />
        </div>
        {turn.listens === 0 && <p className="ul-take-line">Listen at least once first.</p>}
        {copy && !note && <p className="ul-take-line">{copy.seconds.toFixed(1)} seconds copied.</p>}
        {note && <p className="ul-take-note">{note}</p>}
        {trouble && <MicTrouble problem={trouble.problem} />}
      </div>
      {copy && (
        <button type="button" className="btn btn-primary btn-big" onClick={playToTeam}>
          Play it to {teamName(turn.team)}
          <ForwardsIcon width={20} height={20} />
        </button>
      )}
      <EndGame />
    </div>
  );
}

/** Plays the reveal: the original, then the ulta version, after a cheer or a shrug. */
function reveal(take: { original: Take | null; copy: Take | null }, delay = 0) {
  if (take.original && take.copy) playClips([take.original.ahead, take.copy.back], delay);
}

/** The team hears the copy the right way round and guesses, against the clock. */
function Guess({ room, game, names }: ScreenProps) {
  const { turn } = game;
  const key = turnKey(game);
  const takes = useTakes(key);
  useLost(takes.copy === null);
  const now = useClock();
  const { sound } = room.options;
  if (!takes.copy) return <div className="party-play" aria-busy="true" />;
  const copy = takes.copy;

  const singer = names[turn.singer];
  const left = timeLeft(turn.guess, now);
  const got = () => {
    const at = Date.now();
    if (timeLeft(turn.guess, at) === 0) return;
    if (sound) cheer();
    reveal(takesFor(key), 0.8);
    act({ type: "guessed", now: at });
  };
  const missed = () => {
    stopPlaying();
    if (!turn.team) {
      if (sound) shrug();
      reveal(takesFor(key), 0.8);
    }
    act({ type: "missed", now: Date.now() });
  };

  return (
    <div className="party-play">
      <Head game={game} label={turn.team ? `Team ${TEAM_NAMES[turn.team]} guesses` : "Everyone guesses"} />
      <div className="party-stage ul-guess">
        <h2 className="party-title">What&apos;s the song?</h2>
        <p className="party-help">
          {turn.team ? `Team ${TEAM_NAMES[turn.team]}, guess together.` : "Everyone guess."} {singer} knows, and says if
          you got it.
        </p>
        <button type="button" className="btn ul-again" onClick={() => playClips([copy.back])}>
          <ForwardsIcon width={16} height={16} />
          Play it again
        </button>
        <RingTimer
          timer={turn.guess}
          total={GUESS_MS}
          sound={sound}
          onTimer={(op, at) => act({ type: "timer", op, now: at })}
        />
      </div>
      {left > 0 ? (
        <div className="ul-pair">
          <button type="button" className="btn" onClick={missed}>
            Missed it
          </button>
          <button type="button" className="btn btn-primary" onClick={got}>
            Got it!
          </button>
        </div>
      ) : (
        <button type="button" className="btn btn-primary btn-big" onClick={missed}>
          {turn.team ? `Over to Team ${TEAM_NAMES[other(turn.team)]}` : "Show the answer"}
        </button>
      )}
      <Scores room={room} game={game} />
      <EndGame />
    </div>
  );
}

/** They missed: the other team gets one guess. */
function Steal({ room, game, names }: ScreenProps) {
  const { turn } = game;
  const key = turnKey(game);
  const { copy } = useTakes(key);
  const thief = TEAM_NAMES[other(turn.team ?? "a")];
  const { sound } = room.options;
  const end = (stolen: boolean) => {
    if (sound) (stolen ? cheer : shrug)();
    reveal(takesFor(key), 0.8);
    act({ type: stolen ? "stolen" : "not-stolen" });
  };
  return (
    <div className="party-play">
      <Head game={game} label="Steal" />
      <div className="party-stage ul-steal">
        <p className="ul-kicker">Team {TEAM_NAMES[turn.team ?? "a"]} missed it</p>
        <h2 className="party-title is-big">Team {thief}, steal it!</h2>
        <p className="party-help">One guess, all together. {names[turn.singer]} says if it&apos;s right.</p>
        {copy && (
          <button type="button" className="btn ul-again" onClick={() => playClips([copy.back])}>
            <ForwardsIcon width={16} height={16} />
            Play it again
          </button>
        )}
      </div>
      <div className="ul-pair">
        <button type="button" className="btn" onClick={() => end(false)}>
          Wrong
        </button>
        <button type="button" className="btn btn-primary" onClick={() => end(true)}>
          Stolen!
        </button>
      </div>
      <Scores room={room} game={game} />
      <EndGame />
    </div>
  );
}

/** The song, the original and the ulta version back to back, and the points. */
function Reveal({ room, game, names }: ScreenProps) {
  const { turn } = game;
  const key = turnKey(game);
  const takes = useTakes(key);
  const won = winner(game, room.options.target);
  const singer = names[turn.singer];
  const gain = turn.result === "guessed" ? turn.team : turn.result === "stolen" && turn.team ? other(turn.team) : null;
  const next = () => {
    stopPlaying();
    dropTakes();
    act({ type: "next" });
  };
  const stamp = turn.result === "guessed" ? "Got it!" : turn.result === "stolen" ? "Stolen!" : "Nobody got it";

  return (
    <div className="party-play">
      <Head game={game} label="The reveal" />
      <div className="party-stage ul-reveal">
        <Stamp className={turn.result === "missed" ? "ul-stamp is-miss" : "ul-stamp"}>{stamp}</Stamp>
        {turn.song ? (
          <div className="card ul-song">
            <span className="ul-song-kicker">The song</span>
            <span className="ul-song-title">{turn.song.title}</span>
            <span className="ul-song-from">from {turn.song.from}</span>
          </div>
        ) : (
          <p className="ul-song-own">{singer}, tell them the song.</p>
        )}
        {takes.original && takes.copy ? (
          <>
            <button type="button" className="btn ul-both" onClick={() => reveal(takes)}>
              <ForwardsIcon width={16} height={16} />
              Hear both again
            </button>
            <p className="party-help">
              {singer}&apos;s line, then {names[turn.copier]}&apos;s copy the right way round.
            </p>
          </>
        ) : (
          <p className="party-help">The recordings went when the page reloaded.</p>
        )}
      </div>
      <Scores room={room} game={game} gain={gain} />
      <button type="button" className="btn btn-primary btn-big" onClick={next}>
        {won ? "See who won" : turn.team ? `Next: Team ${TEAM_NAMES[other(turn.team)]}` : "Next turn"}
      </button>
      <EndGame />
    </div>
  );
}

/** A team reached the target. */
function Won({ room, game, names }: ScreenProps) {
  const champ = winner(game, room.options.target) ?? "a";
  const players = (game.order[champ] ?? []).map((id) => names[id]);
  return (
    <div className="party-play">
      <Head game={game} label="Game over" />
      <div className="party-stage ul-won">
        <span className="ul-badge">First to {room.options.target}</span>
        <h2 className="ul-headline">Team {TEAM_NAMES[champ]} wins!</h2>
        <p className="party-help">{joinNames(players)}</p>
      </div>
      <Scores room={room} game={game} />
      <div className="ul-pair">
        <button type="button" className="btn" onClick={() => act({ type: "lobby" })}>
          Players &amp; teams
        </button>
        <button type="button" className="btn btn-primary" onClick={() => act({ type: "start", rng: cryptoRandom })}>
          Play again
        </button>
      </div>
    </div>
  );
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

/** Both teams' points, the team whose turn it is marked, and a +1 where a point just went. */
function Scores({ room, game, gain }: { room: Room; game: Game; gain?: TeamId | null }) {
  if (game.mode !== "teams") return null;
  return (
    <div className="ul-scores">
      {TEAM_IDS.map((team) => (
        <div key={team} className="ul-score" data-turn={team === game.turn.team && !game.over}>
          <span className="ul-score-name">{TEAM_NAMES[team]}</span>
          {gain === team && <span className="ul-gain">+1</span>}
          <span className="ul-score-num">
            {game.scores[team]}
            <span className="party-visually-hidden"> {game.scores[team] === 1 ? "point" : "points"}</span>
          </span>
        </div>
      ))}
      <span className="ul-score-to">to {room.options.target}</span>
    </div>
  );
}

/** The way out of a game: back to players and teams, after asking. */
function EndGame() {
  const [asking, setAsking] = useState(false);
  if (asking) {
    return (
      <Confirm
        title="End this game?"
        detail="The scores are cleared. Back to players and teams."
        yes="End game"
        onNo={() => setAsking(false)}
        onYes={() => {
          stopPlaying();
          dropTakes();
          act({ type: "lobby" });
        }}
      />
    );
  }
  return (
    <div className="party-foot">
      <button type="button" className="btn ul-small" onClick={() => setAsking(true)}>
        End game
      </button>
    </div>
  );
}
