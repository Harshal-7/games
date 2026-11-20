import type { NightRole } from "./roles";

/**
 * Every line the narrator says that has no player's name in it: the nights' scenes, the
 * calls, the day and the end. These are recorded once in a good voice
 * (scripts/record-narrator.mjs) and play from files; lines with names use the phone's
 * own voice. No imports that run, so the recording script can read this file directly.
 */

export type NightScript = {
  /** "Night falls. Everyone, close your eyes." */
  dusk: string;
  open: Record<NightRole, string>;
  /** "Everyone, wake up." */
  dawn: string;
};

/** The scenes, in turn: night 1 of the first game is the classic one. */
export const NIGHTS: readonly NightScript[] = [
  {
    dusk: "Night falls. Everyone, close your eyes.",
    open: {
      mafia: "Mafia, open your eyes and pick someone.",
      doctor: "Doctor, open your eyes. Who do you want to save?",
      police: "Police, open your eyes. Who do you want to check?",
    },
    dawn: "Everyone, wake up.",
  },
  {
    dusk: "Power cut! The whole town goes dark. Everyone, close your eyes.",
    open: {
      mafia: "Mafia, open your eyes. Nobody can see a thing. Pick someone.",
      doctor: "Doctor, open your eyes and light a candle. Who do you want to save?",
      police: "Police, open your eyes. Torch on. Who do you want to check?",
    },
    dawn: "The lights are back. Everyone, wake up.",
  },
  {
    dusk: "It's pouring outside, and the whole town is indoors. Everyone, close your eyes.",
    open: {
      mafia: "Mafia, open your eyes. The thunder hides every footstep. Pick someone.",
      doctor: "Doctor, open your eyes. Umbrella ready? Who do you want to save?",
      police: "Police, open your eyes. Raincoat on. Who do you want to check?",
    },
    dawn: "The rain has stopped. Everyone, wake up.",
  },
  {
    dusk: "The match is over and the town has finally gone quiet. Everyone, close your eyes.",
    open: {
      mafia: "Mafia, open your eyes. Time for your late-night plan. Pick someone.",
      doctor: "Doctor, open your eyes. Who do you want to save tonight?",
      police: "Police, open your eyes. Somebody looks suspicious. Who do you want to check?",
    },
    dawn: "Cock-a-doodle-doo! Everyone, wake up.",
  },
];

export const CLOSE: Record<NightRole, string> = {
  mafia: "Mafia, close your eyes.",
  doctor: "Doctor, close your eyes.",
  police: "Police, close your eyes.",
};

export const NOBODY_DIED = "Nobody died last night.";

export function dayLine(minutes: number): string {
  const time = minutes === 1 ? "1 minute" : `${minutes} minutes`;
  return `Chalo, time to talk. Who's the Mafia? You have ${time}. If you're out, no talking.`;
}
/** The talk times on offer (game.ts TALK_MINUTES; a test keeps the two in step). */
const TALKS = [2, 3, 5];

export const VOTE_LINE = "Time to vote. On three, everyone point at who you think is Mafia. One. Two. Three!";
export const VOTE_AGAIN_LINE = "It's a tie. One more time: on three, point again. One. Two. Three!";
export const NOBODY_OUT = "It's a tie, so nobody is out today.";

export const END_LINES: Record<"town" | "mafia", string> = {
  town: "The town wins! Every Mafia is out. Sleep well tonight.",
  mafia: "The Mafia win! There are as many of them as everyone else, and the town is theirs.",
};

/** Every recorded line, once each. */
export const FIXED_LINES: readonly string[] = [
  ...new Set([
    ...NIGHTS.flatMap((night) => [night.dusk, night.open.mafia, night.open.doctor, night.open.police, night.dawn]),
    ...Object.values(CLOSE),
    NOBODY_DIED,
    ...TALKS.map(dayLine),
    VOTE_LINE,
    VOTE_AGAIN_LINE,
    NOBODY_OUT,
    END_LINES.town,
    END_LINES.mafia,
  ]),
];

/** The recorded narrator's voice, and where its clips live (under public/). */
export const VOICE = "heart";
export const CLIP_DIR = `/voice/${VOICE}`;

/** A line's clip file name: a short hash of its words, so editing a line needs a new clip. */
export function clipFile(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `${(hash >>> 0).toString(16).padStart(8, "0")}.mp3`;
}
