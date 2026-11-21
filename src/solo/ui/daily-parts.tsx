"use client";

import { useState } from "react";

import { useClock } from "@/party/ui/use-clock";
import { CopyIcon, ShareIcon } from "@/ui/icons";

import { currentStreak, msUntilNextDay, type DailyStats } from "../daily";
import { copyText, shareText, type ShareOutcome } from "../share";

import "./solo.css";

const SAID: Record<ShareOutcome, string> = {
  shared: "Shared.",
  copied: "Copied. Paste it in your chat.",
  cancelled: "",
  failed: "Couldn't copy here. Select the line and copy it.",
};

/** The share line in a box, with Share (the phone's sheet, or a copy) and Copy. */
export function ShareBox({ text }: { text: string }) {
  const [said, setSaid] = useState("");
  return (
    <div className="daily-share">
      <p className="daily-share-line">{text}</p>
      <div className="daily-share-actions">
        <button type="button" className="btn btn-primary" onClick={async () => setSaid(SAID[await shareText(text)])}>
          <ShareIcon width={18} height={18} strokeWidth={2.4} /> Share
        </button>
        <button type="button" className="btn" onClick={async () => setSaid(SAID[await copyText(text)])}>
          <CopyIcon width={16} height={16} strokeWidth={2.4} /> Copy
        </button>
      </div>
      <p className="daily-share-said" aria-live="polite">
        {said}
      </p>
    </div>
  );
}

/** "7h 12m" until the next daily. */
export function NextDaily({ what }: { what: string }) {
  const now = useClock();
  if (!now) return null;
  const left = msUntilNextDay(now);
  const h = Math.floor(left / 3_600_000);
  const m = Math.floor((left % 3_600_000) / 60_000);
  return (
    <span className="daily-next">
      {what} in{" "}
      <span className="daily-num">{h > 0 ? `${h}h ${m}m` : `${Math.max(1, m)}m`}</span>
    </span>
  );
}

/**
 * The daily stats: played, won, the streak and the best one, then one bar per score
 * (guesses taken, hands made), today's in the game's colour.
 */
export function DailyStatsCard({
  stats,
  today,
  wonLabel,
  distLabel,
  scores,
  todayScore,
}: {
  stats: DailyStats;
  today: string;
  wonLabel: string;
  distLabel: string;
  /** The scores to show bars for, in order. */
  scores: number[];
  /** Today's score, highlighted; null when today isn't on the chart. */
  todayScore: number | null;
}) {
  const won = wonLabel === "Won" ? (stats.played ? `${Math.round((stats.wins / stats.played) * 100)}%` : "–") : String(stats.wins);
  const top = Math.max(1, ...scores.map((s) => stats.dist[s] ?? 0));
  return (
    <section className="card daily-stats" aria-label="Your daily stats">
      <dl className="daily-stats-row">
        <div>
          <dt>Played</dt>
          <dd>{stats.played}</dd>
        </div>
        <div>
          <dt>{wonLabel}</dt>
          <dd>{won}</dd>
        </div>
        <div>
          <dt>Streak</dt>
          <dd>{currentStreak(stats, today)}</dd>
        </div>
        <div>
          <dt>Best streak</dt>
          <dd>{stats.bestStreak}</dd>
        </div>
      </dl>
      <div className="daily-dist">
        <span className="label">{distLabel}</span>
        {scores.map((s) => {
          const n = stats.dist[s] ?? 0;
          return (
            <div key={s} className="daily-dist-row">
              <span className="daily-num">{s}</span>
              <span
                className={s === todayScore ? "daily-dist-bar is-today" : "daily-dist-bar"}
                style={{ width: `${Math.max(8, Math.round((n / top) * 100))}%` }}
              >
                {n}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
