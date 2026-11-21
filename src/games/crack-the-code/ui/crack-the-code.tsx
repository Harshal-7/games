"use client";

import { useEffect, useEffectEvent, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import { cryptoRandom } from "@/party/logic/random";
import { useClock } from "@/party/ui/use-clock";
import { currentStreak, hintsText, playedToday, puzzleNumber, shareLine, type DailyResult } from "@/solo/daily";
import { DailyStatsCard, NextDaily, ShareBox } from "@/solo/ui/daily-parts";
import { useToday } from "@/solo/ui/use-today";
import { Confirm } from "@/ui/confirm";
import { count, formatDuration } from "@/ui/format";
import { BackspaceIcon, BulbIcon, CheckIcon, ClockIcon } from "@/ui/icons";
import { useLeaveGuard } from "@/ui/leave-guard";

import { codesLeft, DAILY_RULES, hintCode, MAX_GUESSES, newSecret, type Rules } from "../logic/code";
import { canType, dailySecret, newGame, status, type Game } from "../logic/game";
import { dial, open, shut } from "./sounds";
import { act, recordDaily, useOptions, useSaved, useStats } from "./stores";

import "./crack-the-code.css";

const NAME = "Crack the code";
const LENGTHS = [
  { length: 3, label: "3 digits", level: "Easy" },
  { length: 4, label: "4 digits", level: "Normal" },
  { length: 5, label: "5 digits", level: "Hard" },
] as const;

function dateLabel(day: string): string {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

/** The day's result for the stats: guesses used when cracked, 0 when not. */
function dailyResult(game: Game): DailyResult | null {
  if (game.mode !== "daily" || !game.day || game.endedAt === null) return null;
  const won = status(game) === "won";
  return { day: game.day, won, score: won ? game.guesses.length : 0, ms: game.endedAt - game.startedAt, hints: game.hints };
}

/** "1 guess", "5 guesses". */
function guessesText(n: number): string {
  return n === 1 ? "1 guess" : `${n} guesses`;
}

function shareFor(result: DailyResult): string {
  return shareLine(NAME, puzzleNumber(result.day), [
    result.won ? guessesText(result.score) : "not cracked",
    formatDuration(result.ms),
    hintsText(result.hints),
  ]);
}

export function CrackTheCode() {
  const saved = useSaved();
  const today = useToday();
  // A daily from an earlier day is over: back to the start screen, with today's code.
  const stale = saved.game?.mode === "daily" && today !== null && saved.game.day !== today;
  const game = stale ? null : saved.game;

  useEffect(() => {
    if (stale) act({ type: "quit" });
  }, [stale]);

  // An unfinished game asks before "‹ Games" clears it.
  const playing = game !== null && status(game) === "playing";
  useLeaveGuard("crack-the-code", {
    ask: playing && game.guesses.length > 0,
    detail: game?.mode === "daily" ? "Today's code stays where it is, but the clock keeps running." : "This code will be lost.",
    end: () => {
      // Today's daily keeps its place (one go a day); Practice starts afresh.
      if (game?.mode !== "daily" || !playing) act({ type: "quit" });
    },
  });

  if (!game) return <Start practice={saved.practice} today={today} />;
  return <Play game={game} />;
}

/* ---------- The start screen: Daily or Practice ---------- */

function Start({ practice, today }: { practice: Rules; today: string | null }) {
  const stats = useStats();
  const done = today ? playedToday(stats, today) : null;

  function startDaily() {
    if (!today) return;
    act({ type: "start", game: newGame("daily", DAILY_RULES, dailySecret(today), today, Date.now()) });
  }
  function startPractice() {
    act({ type: "start", game: newGame("practice", practice, newSecret(practice, cryptoRandom), null, Date.now()) });
  }

  return (
    <div className="cc cc-start">
      <div className="cc-intro">
        <h1 className="game-title">{NAME}</h1>
        <p className="game-blurb">
          Guess the secret code. Each guess tells you how many digits are in the right place, and how many are in the
          code but somewhere else.
        </p>
      </div>

      <div className="cc-start-cards">
        <section className="card cc-mode" aria-labelledby="cc-daily">
          <span className="tape is-game">Daily</span>
          <div className="cc-mode-head">
            <h2 id="cc-daily">
              Today&apos;s code {today && <span className="daily-num">#{puzzleNumber(today)}</span>}
            </h2>
            {today && <span className="cc-mode-date">{dateLabel(today)}</span>}
          </div>
          {done ? (
            <>
              <p className="cc-mode-note">
                {done.won ? <CheckIcon width={15} height={15} strokeWidth={3} /> : null}
                {done.won ? `Cracked in ${done.score} · ${formatDuration(done.ms)}` : `Not cracked · ${formatDuration(done.ms)}`}
                {" · "}
                {hintsText(done.hints)}
              </p>
              <ShareBox text={shareFor(done)} />
              <NextDaily what="Next code" />
            </>
          ) : (
            <>
              <p className="cc-mode-note">4 digits, no repeats, 10 guesses. The same code for everyone today, one go.</p>
              <dl className="cc-minis">
                <div>
                  <dt className="label">Played</dt>
                  <dd>{stats.played}</dd>
                </div>
                <div>
                  <dt className="label">Won</dt>
                  <dd>{stats.played ? `${Math.round((stats.wins / stats.played) * 100)}%` : "–"}</dd>
                </div>
                <div>
                  <dt className="label">Streak</dt>
                  <dd>{today ? currentStreak(stats, today) : 0}</dd>
                </div>
              </dl>
              <button type="button" className="btn btn-primary btn-big" onClick={startDaily} disabled={!today}>
                Crack today&apos;s code
              </button>
            </>
          )}
        </section>

        <section className="card cc-mode" aria-labelledby="cc-practice">
          <span className="tape" id="cc-practice">
            Practice
          </span>
          <p className="cc-mode-note">Endless new codes, as many as you like.</p>
          <div className="seg cc-lengths" role="radiogroup" aria-label="Digits">
            {LENGTHS.map(({ length, label, level }) => (
              <button
                key={length}
                type="button"
                role="radio"
                aria-checked={practice.length === length}
                onClick={() => act({ type: "practice", rules: { ...practice, length } })}
              >
                <span>{label}</span>
                <span className="cc-level">{level}</span>
              </button>
            ))}
          </div>
          <div className="switch-row">
            <span>
              <span className="switch-label">Repeated digits</span>
              <span className="switch-detail">Codes like 4 4 0 7</span>
            </span>
            <button
              type="button"
              className="switch"
              role="switch"
              aria-checked={practice.repeats}
              aria-label="Repeated digits"
              onClick={() => act({ type: "practice", rules: { ...practice, repeats: !practice.repeats } })}
            >
              <span />
            </button>
          </div>
          <button type="button" className="btn" onClick={startPractice}>
            Start a practice code
          </button>
        </section>
      </div>

      <p className="cc-foot">
        <ClockIcon width={16} height={16} strokeWidth={2.2} />A new daily code every midnight, India time.
      </p>
    </div>
  );
}

/* ---------- Playing, and the result ---------- */

function Play({ game }: { game: Game }) {
  const { sound } = useOptions();
  const today = useToday();
  const stats = useStats();
  const [giveUp, setGiveUp] = useState(false);
  const state = status(game);
  const over = state !== "playing";
  const length = game.rules.length;

  const left = useMemo(() => codesLeft(game.rules, game.guesses), [game.rules, game.guesses]);
  const now = useClock(!over);
  const time = (game.endedAt ?? (now || game.startedAt)) - game.startedAt;

  // The day's result goes in the stats once, as soon as the daily ends.
  const result = dailyResult(game);
  const resultKey = result ? JSON.stringify(result) : "";
  useEffect(() => {
    if (resultKey) recordDaily(JSON.parse(resultKey) as DailyResult);
  }, [resultKey]);

  // Sound: a dial click for each guess, a run of notes when it opens, two low ones when it doesn't.
  const guesses = game.guesses.length;
  const lastGuesses = useRef(guesses);
  useEffect(() => {
    const before = lastGuesses.current;
    lastGuesses.current = guesses;
    if (!sound || guesses <= before) return;
    if (state === "won") open();
    else if (state === "lost") shut();
    else dial();
  }, [guesses, state, sound]);

  // The newest guess stays in view when the list scrolls (phones).
  const list = useRef<HTMLOListElement>(null);
  useLayoutEffect(() => {
    const el = list.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [guesses]);

  function hint() {
    const code = hintCode(game.rules, game.guesses, cryptoRandom);
    if (code) act({ type: "hint", code });
  }
  function guess() {
    act({ type: "guess", now: Date.now() });
  }
  function again() {
    act({ type: "start", game: newGame("practice", game.rules, newSecret(game.rules, cryptoRandom), null, Date.now()) });
  }

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (over || e.defaultPrevented || e.altKey || e.metaKey || e.ctrlKey) return;
    if (e.target instanceof Element && e.target.closest("input, textarea, select, [contenteditable]")) return;
    if (/^\d$/.test(e.key)) act({ type: "type", digit: e.key });
    else if (e.key === "Backspace") act({ type: "delete" });
    else if (e.key === "Enter" && game.typed.length === length) {
      e.preventDefault();
      guess();
    } else if (e.key.toLowerCase() === "h") hint();
  });
  useEffect(() => {
    const listener = (e: KeyboardEvent) => onKey(e);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  const meta = [
    game.mode === "daily" && game.day ? `Daily #${puzzleNumber(game.day)}` : "Practice",
    `${length} digits${game.rules.repeats ? ", repeats" : ""}`,
    over ? guessesText(guesses) : `guess ${guesses + 1} of ${MAX_GUESSES}`,
  ].join(" · ");

  const statusText =
    state === "won" ? (
      <>
        <CheckIcon width={16} height={16} strokeWidth={3} /> Cracked
      </>
    ) : state === "lost" ? (
      "Not cracked"
    ) : (
      <>
        <span className="cc-status-num">{left.length.toLocaleString("en-IN")}</span> {left.length === 1 ? "code" : "codes"} left
      </>
    );

  // Big screens show all ten rows; the unused ones are dashed.
  const blanks = Math.max(0, MAX_GUESSES - guesses - (over ? 0 : 1));

  return (
    <div className="cc cc-play" data-state={state}>
      <div className="cc-intro">
        <h1 className="game-title">{NAME}</h1>
        <p className="cc-meta label">{meta}</p>
      </div>

      <div className="card cc-status">
        <span className="cc-status-text" aria-live="polite">
          {statusText}
        </span>
        <span className="cc-status-side">
          <span className="cc-time" aria-label={`Time ${formatDuration(time)}`}>
            <ClockIcon width={15} height={15} strokeWidth={2} />
            {formatDuration(time)}
          </span>
          {!over && (
            <button type="button" className="btn cc-hint" onClick={hint} title="Hint (H)">
              <BulbIcon width={15} height={15} strokeWidth={2.6} /> Hint
            </button>
          )}
        </span>
      </div>

      <div className="cc-board-area">
        <ol className="cc-board" ref={list} aria-label="Your guesses" style={{ "--len": length, "--peg-cols": Math.ceil(length / 2) } as CSSProperties}>
          {game.guesses.map((g, i) => {
            const cracked = g.right === length;
            return (
              <li
                key={i}
                className={cracked ? "cc-row is-cracked" : "cc-row"}
                aria-label={`Guess ${i + 1}, ${[...g.code].join(" ")}: ${g.right} in the right place, ${g.near} in the wrong place`}
              >
                <span className="cc-row-n">{i + 1}</span>
                <span className="cc-tiles" aria-hidden="true">
                  {[...g.code].map((d, k) => (
                    <span key={k} className="cc-tile">
                      {d}
                    </span>
                  ))}
                </span>
                <span className="cc-pegs" aria-hidden="true">
                  {Array.from({ length }, (_, k) => (
                    <span key={k} className={k < g.right ? "cc-peg is-right" : k < g.right + g.near ? "cc-peg is-near" : "cc-peg"} />
                  ))}
                </span>
              </li>
            );
          })}
          {!over && (
            <li className="cc-row is-now" aria-label={`Guess ${guesses + 1}, typing: ${[...game.typed].join(" ") || "nothing yet"}`}>
              <span className="cc-row-n">{guesses + 1}</span>
              <span className="cc-tiles" aria-hidden="true">
                {Array.from({ length }, (_, k) => (
                  <span
                    key={k}
                    className={k < game.typed.length ? "cc-tile" : k === game.typed.length ? "cc-tile is-caret" : "cc-tile is-empty"}
                  >
                    {game.typed[k] ?? ""}
                  </span>
                ))}
              </span>
              <span className="cc-row-left">{MAX_GUESSES - guesses - 1 > 0 ? `${MAX_GUESSES - guesses - 1} more` : "last one"}</span>
            </li>
          )}
          {Array.from({ length: blanks }, (_, i) => (
            <li key={`b${i}`} className="cc-row is-blank" aria-hidden="true">
              <span className="cc-row-n">{guesses + (over ? 1 : 2) + i}</span>
              <span className="cc-tiles">
                {Array.from({ length }, (_, k) => (
                  <span key={k} className="cc-tile is-empty" />
                ))}
              </span>
            </li>
          ))}
        </ol>
        {!over && (
          <p className="cc-legend">
            <span>
              <span className="cc-peg is-right" aria-hidden="true" />
              right place
            </span>
            <span>
              <span className="cc-peg is-near" aria-hidden="true" />
              in the code, wrong place
            </span>
          </p>
        )}
      </div>

      <div className="cc-actions">
        {!over ? (
          <Pad game={game} onGuess={guess} />
        ) : (
          <Result
            game={game}
            time={time}
            today={today}
            stats={stats}
            onAgain={again}
            onBack={() => act({ type: "quit" })}
          />
        )}
        {!over && game.mode === "practice" && (
          <div className="cc-giveup">
            {giveUp ? (
              <Confirm
                title="Show the code?"
                detail="This code ends here, not cracked."
                yes="Show the code"
                no="Keep guessing"
                onYes={() => {
                  setGiveUp(false);
                  act({ type: "giveUp", now: Date.now() });
                }}
                onNo={() => setGiveUp(false)}
              />
            ) : (
              <button type="button" className="cc-link" onClick={() => setGiveUp(true)}>
                Give up and show the code
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- The notepad and the number pad ---------- */

const MARK_WORDS = ["", ", marked out", ", marked in"];

function Pad({ game, onGuess }: { game: Game; onGuess: () => void }) {
  const full = game.typed.length === game.rules.length;
  return (
    <div className="cc-pad-area">
      <div className="cc-notes" role="group" aria-label="Notepad: tap a digit to mark it out, again to mark it in, again to clear">
        {game.notes.map((mark, d) => (
          <button
            key={d}
            type="button"
            className={mark === 1 ? "cc-note is-out" : mark === 2 ? "cc-note is-in" : "cc-note"}
            aria-label={`${d}${MARK_WORDS[mark]}`}
            onClick={() => act({ type: "note", digit: d })}
          >
            {d}
          </button>
        ))}
      </div>
      <div className="cc-pad">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button
            key={d}
            type="button"
            className="btn cc-key"
            disabled={!canType(game, d)}
            onClick={() => act({ type: "type", digit: d })}
          >
            {d}
          </button>
        ))}
        <button type="button" className="btn cc-key" aria-label="Delete" disabled={!game.typed} onClick={() => act({ type: "delete" })}>
          <BackspaceIcon width={22} height={22} strokeWidth={2.4} />
        </button>
        <button type="button" className="btn cc-key" disabled={!canType(game, "0")} onClick={() => act({ type: "type", digit: "0" })}>
          0
        </button>
        <button type="button" className="btn btn-primary cc-key cc-go" disabled={!full} onClick={onGuess}>
          Guess
        </button>
      </div>
    </div>
  );
}

/* ---------- The result ---------- */

function Result({
  game,
  time,
  today,
  stats,
  onAgain,
  onBack,
}: {
  game: Game;
  time: number;
  today: string | null;
  stats: ReturnType<typeof useStats>;
  onAgain: () => void;
  onBack: () => void;
}) {
  const won = status(game) === "won";
  const n = game.guesses.length;
  const daily = dailyResult(game);
  const title = won ? `Cracked in ${guessesText(n)}` : "Not this time";
  const sub = [
    game.mode === "daily" && game.day ? `Daily #${puzzleNumber(game.day)}` : "Practice",
    !won && guessesText(n),
    formatDuration(time),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="cc-result-area">
      <section className="card cc-result" role="status">
        <div className="cc-result-head">
          {won && (
            <span className="cc-result-icon" aria-hidden="true">
              <CheckIcon width={20} height={20} strokeWidth={2.8} />
            </span>
          )}
          <div>
            <h2>{title}</h2>
            <div className="cc-result-meta">
              <span>{sub}</span>
              <span className="cc-tag">{game.hints === 0 ? "No hints" : count(game.hints, "hint")}</span>
            </div>
          </div>
        </div>
        <div className="cc-code" aria-label={`The code was ${[...game.secret].join(" ")}`}>
          <span>The code</span>
          {[...game.secret].map((d, i) => (
            <span key={i} className="cc-tile is-code" aria-hidden="true">
              {d}
            </span>
          ))}
        </div>
        {daily ? (
          <ShareBox text={shareFor(daily)} />
        ) : (
          <div className="cc-result-actions">
            <button type="button" className="btn btn-primary" onClick={onAgain} autoFocus>
              Play again
            </button>
            <button type="button" className="btn" onClick={onBack}>
              Change digits
            </button>
          </div>
        )}
      </section>
      {daily && today && (
        <>
          <DailyStatsCard
            stats={stats}
            today={today}
            wonLabel="Won"
            distLabel="Cracked in"
            scores={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}
            todayScore={daily.won ? daily.score : null}
          />
          <div className="cc-after">
            <NextDaily what="Next code" />
            <button type="button" className="btn" onClick={onBack}>
              Practice
            </button>
          </div>
        </>
      )}
    </div>
  );
}
