"use client";

import { Stamp } from "@/party/ui/parts";
import { RingTimer } from "@/party/ui/ring-timer";
import { wakeAudio } from "@/party/ui/sounds";
import { Vote } from "@/party/ui/vote";

import {
  alive,
  lastNight,
  reduce,
  talkMs,
  votedOut,
  winnerOf,
  type Action,
  type Game,
  type Room,
} from "../logic/game";
import { nightScript, STORIES, tell } from "../logic/script";
import { actAndSay, Foot, Head, namesOf, nightNotes, ShownFace, Table } from "./parts";
import { act } from "./use-room";

/** A main button's tap: the action, and the next screen's lines said from the tap itself. */
function go(room: Room, action: Action): void {
  actAndSay(room, action, reduce(room, action));
}

/** The morning: who the Mafia got, as a story, and what they were. Or nobody. */
export function Morning({ room, game }: { room: Room; game: Game }) {
  const names = namesOf(room);
  const log = lastNight(game);
  const died = log?.died ?? null;
  const winner = winnerOf(game);

  const startDay = () => {
    // The tap that starts the clock also wakes the audio for its ticks later (iPhones).
    if (room.options.sound) wakeAudio();
    go(room, { type: "day", now: Date.now() });
  };

  return (
    <div className="party-play">
      <Head chip={`Day ${game.round}`} label="Morning" />
      <div className="party-stage">
        <SunMark />
        <h2 className="party-title maf-wake">{nightScript(game.number, game.round).dawn}</h2>
        {died ? (
          <>
            <p className="card maf-story">{tell(log?.story ?? STORIES[0], names[died])}</p>
            <div className="party-face is-wide maf-shown">
              <ShownFace name={names[died]} role={game.roles[died]} />
              <Stamp className="maf-shown-stamp">Out</Stamp>
            </div>
          </>
        ) : (
          <p className="card maf-story is-quiet">Nobody died last night.</p>
        )}
        <button
          type="button"
          className="btn btn-primary btn-big maf-go"
          onClick={winner ? () => go(room, { type: "finish" }) : startDay}
        >
          {winner ? "See who won" : "Start the day"}
        </button>
      </div>
      <Foot room={room} />
    </div>
  );
}

/** The day: the table talks against the clock, then votes. Players who are out stay quiet. */
export function Talk({ room, game }: { room: Room; game: Game }) {
  const living = alive(game);
  const mafia = living.filter((id) => game.roles[id] === "mafia").length;

  return (
    <div className="party-play">
      <Head chip={`Day ${game.round}`} label={`${living.length} still in · ${mafia} Mafia`} />
      <div className="party-stage">
        <h2 className="party-title">Talk it out</h2>
        <p className="party-help">Who&apos;s the Mafia? If you&apos;re out, no talking.</p>
        {game.timer && (
          <RingTimer
            timer={game.timer}
            total={talkMs(room.options)}
            sound={room.options.sound}
            onTimer={(op, now) => act({ type: "timer", op, now })}
          />
        )}
        <button
          type="button"
          className="btn btn-primary btn-big maf-go"
          onClick={() => go(room, { type: "vote" })}
        >
          Time to vote
        </button>
        <Table room={room} game={game} />
      </div>
      <Foot room={room} />
    </div>
  );
}

/** Everyone still in points on three; someone taps the most fingers, or calls a tie. */
export function VoteScreen({ room, game }: { room: Room; game: Game }) {
  const names = namesOf(room);
  const again = room.options.tie === "again" && game.ties === 0;
  const vote = (id: string | null) => go(room, { type: "vote-out", id });

  return (
    <div className="party-play">
      <Head chip={`Day ${game.round}`} label={game.ties > 0 ? "Vote again" : "Vote"} />
      <Vote
        key={game.ties}
        title={game.ties > 0 ? "A tie. Point once more" : "Who's out?"}
        people={alive(game).map((id) => ({ id, name: names[id] }))}
        count={1}
        onVote={([id]) => vote(id)}
      >
        <p className="party-help maf-vote-note">Only players still in point. A tie?</p>
        <div className="maf-vote-more">
          <button type="button" className="btn" onClick={() => vote(null)}>
            {again ? "Tie: point again" : "Tie: no one is out"}
          </button>
          <button type="button" className="btn" onClick={() => act({ type: "talk" })}>
            Keep talking
          </button>
        </div>
      </Vote>
      <Foot room={room} />
    </div>
  );
}

/** Who the vote put out, and what they were. Or nobody, on a tie. */
export function Verdict({ room, game }: { room: Room; game: Game }) {
  const names = namesOf(room);
  const out = votedOut(game);
  const winner = winnerOf(game);

  const nextNight = () => {
    if (room.options.sound) nightNotes();
    go(room, { type: "nightfall", now: Date.now() });
  };

  return (
    <div className="party-play">
      <Head chip={`Day ${game.round}`} label="The vote" />
      <div className="party-stage">
        {out ? (
          <>
            <h2 className="party-title maf-verdict-title">{names[out]} is out</h2>
            <div className="party-face is-wide maf-shown">
              <ShownFace name={names[out]} role={game.roles[out]} />
              <Stamp className="maf-shown-stamp">Out</Stamp>
            </div>
          </>
        ) : (
          <>
            <h2 className="party-title is-big">Nobody is out</h2>
            <p className="party-help">It was a tie, so everyone stays in.</p>
          </>
        )}
        <button
          type="button"
          className="btn btn-primary btn-big maf-go"
          onClick={winner ? () => go(room, { type: "finish" }) : nextNight}
        >
          {winner ? "See who won" : `Start night ${game.round + 1}`}
        </button>
      </div>
      <Foot room={room} />
    </div>
  );
}

function SunMark() {
  return (
    <svg className="maf-sun" viewBox="0 0 64 64" width="72" height="72" aria-hidden="true">
      <circle cx="32" cy="36" r="12" />
      <path d="M32 12v8M14 20l5 5M50 20l-5 5M8 36h8M48 36h8" />
      <path d="M6 50h52" />
    </svg>
  );
}
