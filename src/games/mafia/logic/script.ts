import { randomItem, type Rng } from "@/party/logic/random";

import { roleAfterWas, type NightRole, type Role } from "./roles";

/**
 * Everything the narrator says. Every line is spoken (when the voice is on) and shown
 * in big type. Friendly, plain English with a desi flavour; the night calls are the
 * classic ones, word for word, so everyone knows when to open and close their eyes.
 */

export const DUSK = "Night falls. Everyone, close your eyes.";
export const DAWN = "Everyone, wake up.";
export const NOBODY_DIED = "Nobody died last night.";

const OPEN: Record<NightRole, string> = {
  mafia: "Mafia, open your eyes and pick someone.",
  doctor: "Doctor, open your eyes. Who do you want to save?",
  police: "Police, open your eyes. Who do you want to check?",
};

/** A role's call: "Doctor, open your eyes…" and, once its turn is over, "Doctor, close your eyes." */
export function callLine(role: NightRole, phase: "open" | "close"): string {
  if (phase === "open") return OPEN[role];
  return `${role === "mafia" ? "Mafia" : role === "doctor" ? "Doctor" : "Police"}, close your eyes.`;
}

/** "Rohan was a Villager." */
export function wasLine(name: string, role: Role): string {
  return `${name} was ${roleAfterWas(role)}.`;
}

/** The morning: who's gone, as a short story, and what they were. */
export function morningLines(died: { name: string; role: Role; story: string } | null): string[] {
  if (!died) return [DAWN, NOBODY_DIED];
  return [DAWN, tell(died.story, died.name), wasLine(died.name, died.role)];
}

export function dayLine(minutes: number): string {
  const time = minutes === 1 ? "1 minute" : `${minutes} minutes`;
  return `Chalo, time to talk. Who's the Mafia? You have ${time}. If you're out, no talking.`;
}

export const VOTE_LINE = "Time to vote. On three, everyone point at who you think is Mafia. One. Two. Three!";
export const VOTE_AGAIN_LINE = "It's a tie. One more time: on three, point again. One. Two. Three!";
export const NOBODY_OUT = "It's a tie, so nobody is out today.";

export function outLines(name: string, role: Role): string[] {
  return [`${name} is out.`, wasLine(name, role)];
}

export const END_LINES: Record<"town" | "mafia", string> = {
  town: "The town wins! Every Mafia is out. Sleep well tonight.",
  mafia: "The Mafia win! There are as many of them as everyone else, and the town is theirs.",
};

/**
 * What happened in the night, told in the morning. Silly and family-safe, never gory:
 * whoever the Mafia went for just never came back. {name} is the player.
 */
export const STORIES: readonly string[] = [
  "{name} went out for chai at 3 a.m. and never came back.",
  "The Mafia swapped {name}'s chai for kadha. {name} didn't make it.",
  "{name} argued with the Mafia about the AC temperature, and lost.",
  "{name} got up to check if the geyser was off. The Mafia were waiting by the switch.",
  "{name} opened the fridge for one last gulab jamun. It was a trap.",
  "{name} answered an unknown number at midnight. Big mistake.",
  "{name} went up to the terrace to look at the stars. The Mafia were looking at {name}.",
  "{name} made Maggi at 2 a.m. The Mafia smelled it from three houses away.",
  "{name} said the Mafia's biryani needed more salt. Nobody says that to the Mafia.",
  "The Mafia hid {name}'s phone charger. {name} went looking for it and never came back.",
  "{name} took the last samosa off the Mafia's plate.",
  "{name} told the Mafia how their favourite web series ends.",
  "The Mafia asked {name} for a quick game of carrom. {name} got pocketed.",
  "{name} went to switch on the inverter in the power cut. The lights came back. {name} didn't.",
  "{name} took a selfie with the Mafia in the background. Oops.",
  "{name} hummed the same song all evening. The Mafia couldn't take it any more.",
  "{name} borrowed the Mafia's scooter without asking.",
  "{name} sent good-morning messages at midnight. The Mafia blocked {name}, for good.",
  "{name} went looking for the TV remote down the side of the sofa. The sofa kept {name}.",
  "{name} put pineapple on the Mafia's pizza. Some lines you don't cross.",
  "{name} beat the Mafia at Ludo. Bad move.",
  "{name} called the Mafia's cricket team average.",
  "{name} chased a mosquito out of the room and was never seen again.",
  "{name} stayed up for the match highlights. So did the Mafia.",
  "{name} went to the kitchen for water and caught the Mafia eating the last laddoo.",
  "{name} jumped the queue at the pani puri stall, right in front of the Mafia.",
  "{name} posted the trip photos before anyone said yes to them.",
  "{name} took the window seat the Mafia had called first.",
  "{name} dunked a biscuit in the Mafia's chai, and dropped it in.",
  "{name} said \"just five more minutes\" to the Mafia's alarm.",
  "{name} rang the Mafia's doorbell and ran. The Mafia didn't find it funny.",
  "{name} played music on speaker in the bus. The Mafia were on that bus.",
  "{name} sat in the Mafia's chair at dinner. Everyone knows that's the Mafia's chair.",
  "{name} never gave back the Mafia's tiffin box.",
  "{name} changed the channel in the middle of the Mafia's favourite serial.",
  "{name} drank the Mafia's cold coffee from the fridge.",
  "{name} asked the Mafia for the Wi-Fi password one time too many.",
  "{name} got lost at the mela. The Mafia made sure of it.",
  "{name} hung the washing out at midnight and flew off with a bedsheet.",
  "{name} told the Mafia their dal was a bit too watery.",
];

/** Fills in the player: "{name} went out for chai…" → "Rohan went out for chai…". */
export function tell(story: string, name: string): string {
  return story.replaceAll("{name}", name);
}

/**
 * The next story: one this room hasn't heard yet. Once every story has been told, they
 * start over.
 */
export function pickStory(told: readonly string[], rng: Rng): { story: string; told: string[] } {
  const heard = new Set(told);
  const fresh = STORIES.filter((story) => !heard.has(story));
  const story = randomItem(fresh.length > 0 ? fresh : STORIES, rng);
  return { story, told: fresh.length > 0 ? [...told.filter((s) => STORIES.includes(s)), story] : [story] };
}

/** "Riya", "Riya and Aman", "Riya, Aman and Dev". */
export function listNames(names: readonly string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}
