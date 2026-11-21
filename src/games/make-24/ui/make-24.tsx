"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";

import { cryptoRandom } from "@/party/logic/random";
import { useClock } from "@/party/ui/use-clock";
import { currentStreak, hintsText, playedToday, puzzleNumber, shareLine, type DailyResult } from "@/solo/daily";
import { DailyStatsCard, NextDaily, ShareBox } from "@/solo/ui/daily-parts";
import { useToday } from "@/solo/ui/use-today";
import { Confirm } from "@/ui/confirm";
import { count, formatDuration } from "@/ui/format";
import { BulbIcon, CheckIcon, ClockIcon, RestartIcon, UndoIcon } from "@/ui/icons";
import { useLeaveGuard } from "@/ui/leave-guard";

import { dailyHands, dealHand, DAILY_LEVELS } from "../logic/deal";
import { show, showOp, OPS, type Frac, type Op } from "../logic/frac";
import { handNumber, handState, hintFor, isOver, newRun, tally, type Run } from "../logic/game";
import type { Practice } from "../logic/saved";
import { cardsOf, textOfSteps, type Level, type Step } from "../logic/solver";
import { flick, made, miss } from "./sounds";
import { act, recordDaily, useOptions, useSaved, useStats } from "./stores";

import "./make-24.css";

const NAME = "Make 24";
const LEVELS: { id: Level; label: string }[] = [
  { id: "easy", label: "Easy" },
  { id: "medium", label: "Medium" },
  { id: "hard", label: "Hard" },
];
const LEVEL_NAMES: Record<Level, string> = { easy: "Easy", medium: "Medium", hard: "Hard" };
const OP_NAMES: Record<Op, string> = { "+": "Plus", "-": "Minus", "×": "Times", "÷": "Divide" };
const KEY_OPS: Record<string, Op> = { "+": "+", "-": "-", "*": "×", x: "×", "/": "÷" };

function dateLabel(day: string): string {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

/** The day's result: hands made out of five, all five counting as a win. */
function dailyResult(run: Run): DailyResult | null {
  if (run.mode !== "daily" || !run.day || run.endedAt === null) return null;
  const { made, hints } = tally(run);
  return { day: run.day, won: made === run.hands.length, score: made, ms: run.endedAt - run.startedAt, hints };
}

function shareFor(result: DailyResult): string {
  return shareLine(NAME, puzzleNumber(result.day), [`${result.score}/5`, formatDuration(result.ms), hintsText(result.hints)]);
}

function deal(practice: Practice, avoid?: number[]): number[] {
  return dealHand(practice.level, practice.top, cryptoRandom, new Set(avoid ? [avoid.join(" ")] : []));
}

export function Make24() {
  const saved = useSaved();
  const today = useToday();
  const stale = saved.run?.mode === "daily" && today !== null && saved.run.day !== today;
  const run = stale ? null : saved.run;

  useEffect(() => {
    if (stale) act({ type: "quit" });
  }, [stale]);

  const going = run !== null && !isOver(run);
  useLeaveGuard("make-24", {
    ask: going && run.mode === "practice" && (run.hand.moves.length > 0 || run.done.length > 0),
    detail: "This practice run will be cleared.",
    end: () => {
      // Today's five keep their place (one go a day); Practice starts afresh.
      if (run?.mode !== "daily" || !going) act({ type: "quit" });
    },
  });

  if (!run) return <Start practice={saved.practice} today={today} />;
  return <Play run={run} practice={saved.practice} />;
}

/* ---------- The start screen: Daily or Practice ---------- */

function Start({ practice, today }: { practice: Practice; today: string | null }) {
  const stats = useStats();
  const done = today ? playedToday(stats, today) : null;

  function startDaily() {
    if (!today) return;
    act({ type: "start", run: newRun("daily", dailyHands(today), DAILY_LEVELS[0], 9, today, Date.now()) });
  }
  function startPractice() {
    act({ type: "start", run: newRun("practice", [deal(practice)], practice.level, practice.top, null, Date.now()) });
  }

  return (
    <div className="m24 m24-start">
      <div className="m24-intro">
        <h1 className="game-title">{NAME}</h1>
        <p className="game-blurb">
          Four numbers. Use each one once with + − × ÷ to make 24. Tap a number, a sign, then another number: the two
          become one.
        </p>
      </div>

      <div className="m24-start-cards">
        <section className="card m24-mode" aria-labelledby="m24-daily">
          <span className="tape is-game">Daily</span>
          <div className="m24-mode-head">
            <h2 id="m24-daily">
              Today&apos;s five {today && <span className="daily-num">#{puzzleNumber(today)}</span>}
            </h2>
            {today && <span className="m24-mode-date">{dateLabel(today)}</span>}
          </div>
          {done ? (
            <>
              <p className="m24-mode-note">
                {done.won && <CheckIcon width={15} height={15} strokeWidth={3} />}
                {done.score} of 5 made · {formatDuration(done.ms)} · {hintsText(done.hints)}
              </p>
              <ShareBox text={shareFor(done)} />
              <NextDaily what="New hands" />
            </>
          ) : (
            <>
              <p className="m24-mode-note">Five hands, easy to hard, on one clock. The same hands for everyone today.</p>
              <dl className="m24-minis">
                <div>
                  <dt className="label">Played</dt>
                  <dd>{stats.played}</dd>
                </div>
                <div>
                  <dt className="label">All five</dt>
                  <dd>{stats.wins}</dd>
                </div>
                <div>
                  <dt className="label">Streak</dt>
                  <dd>{today ? currentStreak(stats, today) : 0}</dd>
                </div>
              </dl>
              <button type="button" className="btn btn-primary btn-big" onClick={startDaily} disabled={!today}>
                Play today&apos;s five
              </button>
            </>
          )}
        </section>

        <section className="card m24-mode" aria-labelledby="m24-practice">
          <span className="tape" id="m24-practice">
            Practice
          </span>
          <p className="m24-mode-note">Endless hands, every one can be made.</p>
          <div className="seg m24-levels" role="radiogroup" aria-label="Difficulty">
            {LEVELS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={practice.level === id}
                onClick={() => act({ type: "practice", practice: { ...practice, level: id } })}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="switch-row">
            <span>
              <span className="switch-label">Numbers up to 13</span>
              <span className="switch-detail">Usually 1 to 9</span>
            </span>
            <button
              type="button"
              className="switch"
              role="switch"
              aria-checked={practice.top === 13}
              aria-label="Numbers up to 13"
              onClick={() => act({ type: "practice", practice: { ...practice, top: practice.top === 13 ? 9 : 13 } })}
            >
              <span />
            </button>
          </div>
          <button type="button" className="btn" onClick={startPractice}>
            Deal a hand
          </button>
        </section>
      </div>
    </div>
  );
}

/* ---------- Playing ---------- */

/** A number on a card: whole, or a fraction stacked. */
function Value({ value }: { value: Frac }) {
  if (value.d === 1) return <span className="m24-whole">{value.n}</span>;
  return (
    <span className="m24-frac">
      <span>{value.n}</span>
      <span className="m24-frac-bar" aria-hidden="true" />
      <span>{value.d}</span>
    </span>
  );
}

function label(value: Frac): string {
  return value.d === 1 ? String(value.n) : `${value.n} over ${value.d}`;
}

function Play({ run, practice }: { run: Run; practice: Practice }) {
  const { sound } = useOptions();
  const today = useToday();
  const stats = useStats();
  const [asking, setAsking] = useState(false);
  // The hint belongs to one position: any move or undo drops it.
  const [hint, setHint] = useState<{ at: string; step: Step } | null>(null);
  const { hand } = run;
  const over = isOver(run);
  const state = handState(hand);
  const at = positionKey(run);
  const shownHint = hint && hint.at === at ? hint.step : null;

  const now = useClock(!over && run.mode === "daily");
  const time = (run.endedAt ?? (now || run.startedAt)) - run.startedAt;
  const { made: madeCount } = tally(run);

  // The day's result goes in the stats once, as soon as the five are done.
  const result = dailyResult(run);
  const resultKey = result ? JSON.stringify(result) : "";
  useEffect(() => {
    if (resultKey) recordDaily(JSON.parse(resultKey) as DailyResult);
  }, [resultKey]);

  // Sound: a flick per merge, a run of notes for 24, two low ones when the last card isn't.
  const moves = hand.moves.length;
  const lastMoves = useRef(moves);
  useEffect(() => {
    const before = lastMoves.current;
    lastMoves.current = moves;
    if (!sound || moves <= before || hand.shown) return;
    if (state === "made") made();
    else if (state === "wrong") miss();
    else flick();
  }, [moves, state, sound, hand.shown]);

  function showHint() {
    const h = hintFor(hand);
    if (!h) return;
    act({ type: "hint" });
    if (h.reset) act({ type: "reset" });
    setHint({ at: h.reset ? positionKey({ ...run, hand: { ...hand, moves: [] } }) : at, step: h.step });
  }

  function next() {
    setHint(null);
    act(run.mode === "practice" ? { type: "next", now: Date.now(), deal: deal(practice, hand.numbers) } : { type: "next", now: Date.now() });
  }

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (over || asking || e.defaultPrevented || e.altKey || e.metaKey || e.ctrlKey) return;
    if (e.target instanceof Element && e.target.closest("input, textarea, select, [contenteditable]")) return;
    const key = e.key.toLowerCase();
    if (/^[1-4]$/.test(key)) act({ type: "tap", slot: Number(key) - 1 });
    else if (KEY_OPS[key]) act({ type: "op", op: KEY_OPS[key] });
    else if (key === "backspace" || key === "u") act({ type: "undo" });
    else if (key === "h" && state === "playing") showHint();
    else if (key === "enter" && (state === "made" || state === "missed")) {
      e.preventDefault();
      next();
    }
  });
  useEffect(() => {
    const listener = (e: KeyboardEvent) => onKey(e);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  if (over) return <Done run={run} today={today} stats={stats} />;

  const number = handNumber(run);
  const level = run.mode === "daily" ? (DAILY_LEVELS[number - 1] ?? "hard") : run.level;
  const meta =
    run.mode === "daily" && run.day
      ? `Daily #${puzzleNumber(run.day)} · hand ${number} of 5 · ${LEVEL_NAMES[level]}`
      : `Practice · ${LEVEL_NAMES[level]}${run.top === 13 ? " · up to 13" : ""}`;
  const playing = state === "playing" || state === "wrong";
  const last = hand.slots.find((v) => v !== null) ?? null;
  const lastHand = run.mode === "daily" && number === run.hands.length;

  return (
    <div className="m24 m24-play" data-state={state}>
      <div className="m24-intro">
        <h1 className="game-title">{NAME}</h1>
        <p className="m24-meta label">{meta}</p>
      </div>

      <div className="card m24-status">
        <div className="m24-status-row">
          <span className="m24-status-text" aria-live="polite">
            {run.mode === "daily" ? (
              <>
                <span className="m24-status-num">{madeCount}</span> of 5 made
              </>
            ) : (
              <>
                <span className="m24-status-num">{madeCount}</span> {madeCount === 1 ? "hand" : "hands"} made
              </>
            )}
          </span>
          {run.mode === "daily" && (
            <span className="m24-time" aria-label={`Time ${formatDuration(time)}`}>
              <ClockIcon width={15} height={15} strokeWidth={2} />
              {formatDuration(time)}
            </span>
          )}
        </div>
        {run.mode === "daily" && (
          <div className="m24-pips" aria-hidden="true">
            {run.hands.map((_, i) => {
              const r = run.done[i];
              const current = i === run.done.length;
              const cls = r
                ? r.made
                  ? "is-made"
                  : "is-missed"
                : current && state === "made"
                  ? "is-made"
                  : current && state === "missed"
                    ? "is-missed"
                    : current
                      ? "is-now"
                      : "";
              return <span key={i} className={`m24-pip ${cls}`} />;
            })}
          </div>
        )}
        {/* Always one line, so the cards below never jump: the hint when there is one, else what to tap next. */}
        <p className={shownHint ? "m24-hint-line" : "m24-hint-line is-quiet"} aria-live="polite">
          {shownHint ? (
            <>
              <BulbIcon width={15} height={15} strokeWidth={2.6} />
              Hint: start with{" "}
              <span className="daily-num">
                {show(hand.slots[shownHint.a]!)} {showOp(shownHint.op)} {show(hand.slots[shownHint.b]!)}
              </span>
            </>
          ) : state === "made" ? (
            "Made it."
          ) : state === "missed" ? (
            "Here's one way to make it."
          ) : state === "wrong" ? (
            "Not 24 this time."
          ) : hand.picked === null ? (
            "Tap a number to start."
          ) : hand.op === null ? (
            "Now a sign, or another number instead."
          ) : (
            "Now the number to use it with."
          )}
        </p>
      </div>

      <div className="m24-table">
        <div className="m24-cards" role="group" aria-label="Cards">
          {hand.slots.map((value, slot) => {
            const picked = hand.picked === slot;
            const hinted = shownHint && (shownHint.a === slot || shownHint.b === slot);
            const done = state === "made" && value;
            const cls = ["m24-card", !value && "is-empty", picked && "is-picked", hinted && "is-hinted", done && "is-made"].filter(Boolean).join(" ");
            return (
              <button
                key={`${run.done.length}-${slot}`}
                type="button"
                className={cls}
                disabled={!value || !playing}
                aria-pressed={picked}
                aria-label={value ? `${label(value)}${picked ? ", picked" : ""}` : "Empty"}
                onClick={() => act({ type: "tap", slot })}
              >
                {value && <Value value={value} />}
              </button>
            );
          })}
        </div>
        {hand.moves.length > 0 && (
          <ol className="m24-steps" aria-label="Your steps">
            {hand.moves.map((m, i) => (
              <li key={i}>{stepText(hand.numbers, hand.moves, i)}</li>
            ))}
          </ol>
        )}
      </div>

      <div className="m24-actions">
        {asking ? (
          <Confirm
            title="Show the answer?"
            detail="This hand counts as missed."
            yes="Show me"
            no="Keep trying"
            onYes={() => {
              setAsking(false);
              setHint(null);
              act({ type: "show" });
            }}
            onNo={() => setAsking(false)}
          />
        ) : playing ? (
          <div className="m24-controls">
            {state === "wrong" && last && (
              <p className="card m24-wrong" role="status">
                That&apos;s {show(last)}, not 24. Undo a step or reset.
              </p>
            )}
            <div className="m24-ops" role="group" aria-label="Signs">
              {OPS.map((op) => (
                <button
                  key={op}
                  type="button"
                  className={shownHint?.op === op && hand.op !== op ? "btn m24-op is-hinted" : "btn m24-op"}
                  aria-label={OP_NAMES[op]}
                  aria-pressed={hand.op === op}
                  disabled={state === "wrong"}
                  onClick={() => act({ type: "op", op })}
                >
                  {showOp(op)}
                </button>
              ))}
            </div>
            <div className="m24-tools">
              <button type="button" className="btn" onClick={() => act({ type: "undo" })} disabled={!hand.moves.length} title="Undo (U)">
                <UndoIcon width={15} height={15} strokeWidth={2.6} /> Undo
              </button>
              <button type="button" className="btn" onClick={showHint} title="Hint (H)">
                <BulbIcon width={15} height={15} strokeWidth={2.6} /> Hint
              </button>
              <button type="button" className="btn" onClick={() => setAsking(true)}>
                Show me
              </button>
              <button
                type="button"
                className="btn m24-reset"
                aria-label="Reset the four cards"
                title="Reset"
                onClick={() => act({ type: "reset" })}
                disabled={!hand.moves.length}
              >
                <RestartIcon width={18} height={18} strokeWidth={2.6} />
                <span className="m24-reset-label">Reset</span>
              </button>
            </div>
          </div>
        ) : (
          <section className="card m24-made" role="status">
            <div className="m24-made-head">
              {state === "made" && (
                <span className="m24-made-icon" aria-hidden="true">
                  <CheckIcon width={20} height={20} strokeWidth={2.8} />
                </span>
              )}
              <div>
                <h2>{state === "made" ? (hand.moves.some((m) => m.result.d !== 1) ? "24, with a fraction" : "Made it: 24") : "Missed: here's one way"}</h2>
                <span className="daily-num m24-made-how">{fullText(hand.numbers, hand.moves)}</span>
              </div>
            </div>
            <button type="button" className="btn btn-primary btn-big" onClick={next} autoFocus>
              {run.mode === "practice" ? "Next hand" : lastHand ? "See today's result" : number === run.hands.length - 1 ? "Last hand" : "Next hand"}
            </button>
          </section>
        )}
      </div>
    </div>
  );
}

/** Which hand and which merges: a hint shows only while this stays the same. */
function positionKey(run: Run): string {
  return `${run.done.length}:${run.hand.moves.map((m) => `${m.a}${m.op}${m.b}`).join(",")}`;
}

function fullText(numbers: number[], moves: readonly Step[]): string {
  return textOfSteps(cardsOf(numbers), moves);
}

/** "8 ÷ 3 = 8/3" for the i-th step, with each side as it was on the table. */
function stepText(numbers: number[], moves: readonly Step[], i: number): string {
  const slots: (Frac | null)[] = numbers.map((n) => ({ n, d: 1 }));
  for (let k = 0; k < i; k++) {
    slots[moves[k].b] = moves[k].result;
    slots[moves[k].a] = null;
  }
  const m = moves[i];
  return `${show(slots[m.a]!)} ${showOp(m.op)} ${show(slots[m.b]!)} = ${show(m.result)}`;
}

/* ---------- The daily five, done ---------- */

function Done({ run, today, stats }: { run: Run; today: string | null; stats: ReturnType<typeof useStats> }) {
  const result = dailyResult(run);
  const { made: madeCount, hints } = tally(run);
  const time = (run.endedAt ?? run.startedAt) - run.startedAt;
  return (
    <div className="m24 m24-done">
      <div className="m24-intro">
        <h1 className="game-title">{NAME}</h1>
        <p className="m24-meta label">{run.day ? `Daily #${puzzleNumber(run.day)} · done` : "Done"}</p>
      </div>
      <div className="m24-done-cards">
        <section className="card m24-result" role="status">
          <div className="m24-made-head">
            <span className="m24-made-icon is-24" aria-hidden="true">
              24
            </span>
            <div>
              <h2>{madeCount === 5 ? "All five made" : `${madeCount} of 5 made`}</h2>
              <div className="m24-result-meta">
                <span>
                  {run.day ? `Daily #${puzzleNumber(run.day)} · ` : ""}
                  {formatDuration(time)}
                </span>
                <span className="m24-tag">{hints === 0 ? "No hints" : count(hints, "hint")}</span>
              </div>
            </div>
          </div>
          <ol className="m24-hands" aria-label="Today's hands">
            {run.done.map((h, i) => (
              <li key={i}>
                <span className="daily-num m24-hands-n">{i + 1}</span>
                <span className="daily-num m24-hands-cards">{h.numbers.join(" ")}</span>
                <span className="daily-num m24-hands-how">
                  {h.text}
                  {!h.made && " · missed"}
                  {h.hints > 0 && ` · ${count(h.hints, "hint")}`}
                </span>
              </li>
            ))}
          </ol>
          {result && <ShareBox text={shareFor(result)} />}
        </section>
        {today && result && (
          <div className="m24-done-side">
            <DailyStatsCard
              stats={stats}
              today={today}
              wonLabel="All five"
              distLabel="Hands made"
              scores={[0, 1, 2, 3, 4, 5]}
              todayScore={result.score}
            />
            <div className="m24-after">
              <NextDaily what="New hands" />
              <button type="button" className="btn" onClick={() => act({ type: "quit" })}>
                Practice
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
