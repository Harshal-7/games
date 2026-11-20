"use client";

import { useState } from "react";

import { playNotes } from "@/ui/sound";
import { Confirm } from "@/ui/confirm";

import { holders, isOut, type Game, type Room } from "../logic/game";
import { ROLE_LINES, ROLE_NAMES, type Role } from "../logic/roles";
import { listNames } from "../logic/script";
import { narration } from "../logic/narration";
import { hush, say, unlock } from "./narrator";
import { act } from "./use-room";

/** id → name for everyone in the room. */
export function namesOf(room: Room): Record<string, string> {
  return Object.fromEntries(room.players.map((p) => [p.id, p.name]));
}

/**
 * The chip and label over a play screen ("Night 2" · "Doctor"), in the shared party look.
 * Mafia counts nights and days rather than rounds, so it has its own words in the chip.
 */
export function Head({ chip, label }: { chip: string; label?: string }) {
  return (
    <div className="party-play-head">
      <span className="party-round">{chip}</span>
      {label && <span className="party-play-label">{label}</span>}
    </div>
  );
}

/**
 * A card's face: the role, what it does and how it wins. A Mafia card also names the
 * other Mafia. Every face shares the party card's one layout, so from across the table
 * they all look alike.
 */
export function RoleFace({ game, id, names }: { game: Game; id: string; names: Record<string, string> }) {
  const role = game.roles[id];
  const team = holders(game, "mafia").filter((other) => other !== id);
  return (
    <>
      <span className="party-face-kicker">Your role</span>
      <span className="party-face-word">{ROLE_NAMES[role]}</span>
      {role === "mafia" && (
        <span className="maf-face-team">
          {team.length === 0 ? "You're the only Mafia." : `With ${listNames(team.map((other) => names[other]))}.`}
        </span>
      )}
      <span className="party-face-note">{ROLE_LINES[role]}</span>
    </>
  );
}

/** A face-up card on the table: "Rohan was" / "Villager". */
export function ShownFace({ name, role }: { name: string; role: Role }) {
  return (
    <>
      <span className="party-face-kicker">{name} was</span>
      <span className="party-face-word">{ROLE_NAMES[role]}</span>
    </>
  );
}

/** A soft two-note chime when a line changes and the voice is off, so whoever reads it looks up. */
export function chime(): void {
  playNotes([
    [660, 0, 0.35, 0.05],
    [880, 0.18, 0.5, 0.045],
  ]);
}

/** The night falling: two low notes down. */
export function nightNotes(): void {
  playNotes([
    [523, 0, 0.6, 0.05],
    [392, 0.3, 0.9, 0.05],
  ]);
}

/**
 * Applies an action from a tap and says the next screen's lines straight away. Phones
 * only speak from a tap, so the lines that start the night come from here rather than
 * waiting for the screen to redraw.
 */
export function actAndSay(room: Room, action: Parameters<typeof act>[0], next: Room): void {
  const line = room.options.voice ? narration(next) : null;
  unlock(line !== null);
  act(action);
  if (line) say(line.key, line.lines, true);
}

/** Says the current screen's lines again. */
export function SayAgain({ room }: { room: Room }) {
  const line = narration(room);
  if (!line || !room.options.voice) return null;
  return (
    <button
      type="button"
      className="btn"
      onClick={() => {
        unlock(true);
        say(line.key, line.lines, true);
      }}
    >
      Say it again
    </button>
  );
}

/**
 * The quiet way out of a game, under every play screen: Say it again (when the voice is
 * on) and Stop the game, which asks first and keeps every role a secret.
 */
export function Foot({ room, sayAgain = true }: { room: Room; sayAgain?: boolean }) {
  const [stopping, setStopping] = useState(false);
  if (stopping) {
    return (
      <Confirm
        title="Stop this game?"
        detail="Back to players and options. Nobody gets points, and the roles stay secret."
        yes="Stop game"
        onNo={() => setStopping(false)}
        onYes={() => {
          hush();
          act({ type: "lobby" });
        }}
      />
    );
  }
  return (
    <div className="party-foot">
      {sayAgain && <SayAgain room={room} />}
      <button type="button" className="btn" onClick={() => setStopping(true)}>
        Stop the game
      </button>
    </div>
  );
}

/** Everyone at the table: who's still in, and who's out with their role, face up. */
export function Table({ room, game }: { room: Room; game: Game }) {
  const names = namesOf(room);
  return (
    <ul className="maf-table" aria-label="Players">
      {game.seats.map((id) => {
        const out = isOut(game, id);
        return (
          <li key={id} className="maf-seat" data-out={out || undefined}>
            <span className="maf-seat-name">{names[id]}</span>
            {out && <span className="maf-seat-role">{ROLE_NAMES[game.roles[id]]}</span>}
            {out && <span className="party-visually-hidden">, out</span>}
          </li>
        );
      })}
    </ul>
  );
}
