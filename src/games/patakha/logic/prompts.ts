import { randomItem, type Rng } from "@/party/logic/random";

/**
 * The prompts, in packs the table picks before a game. Every prompt has at least 15
 * answers most people at the table would think of, so a round never stalls on one
 * player. Short enough to read in big type on a phone (MAX_PROMPT), and unique across
 * every pack (a prompt is its own id).
 */

export type PackId = "desi" | "screen" | "letters" | "everyday";

export type Pack = { id: PackId; label: string; emoji: string; prompts: readonly string[] };

/** The longest a prompt may be, so it fits a phone in big type. */
export const MAX_PROMPT = 34;

export const PACKS: readonly Pack[] = [
  {
    id: "desi",
    label: "Desi",
    emoji: "🛺",
    prompts: [
      "an Indian street food",
      "something in Nani's kitchen",
      "a wedding ritual",
      "a train snack",
      "an Indian sweet",
      "an Indian state",
      "an Indian city",
      "a hill station",
      "something at a dhaba",
      "something you see on a highway",
      "a kind of roti or bread",
      "a sabzi",
      "a pickle or chutney",
      "a snack with chai",
      "a brand of biscuit",
      "a snack that comes in a packet",
      "something at a kirana shop",
      "something sold from a cart",
      "an Indian dance form",
      "an Indian language",
      "a word for ‘friend’",
      "something at a mela",
      "a game you played as a kid",
      "something in a school tiffin",
      "something on a thali",
      "a South Indian dish",
      "something famous in Mumbai",
      "an Indian fruit",
      "something at a wedding buffet",
      "something with paneer in it",
      "something every mum says",
      "a cricket term",
      "a way to get around in India",
    ],
  },
  {
    id: "screen",
    label: "Screen",
    emoji: "🎬",
    prompts: [
      "a Shah Rukh film",
      "a Salman Khan film",
      "an Aamir Khan film",
      "an Akshay Kumar film",
      "an Amitabh Bachchan film",
      "a Ranbir Kapoor film",
      "a Hindi film from the 90s",
      "a Bollywood villain",
      "a famous filmy dialogue",
      "a Bollywood actor",
      "a Bollywood actress",
      "a South Indian film",
      "a film with a number in its name",
      "a film with ‘Dil’ in its name",
      "a sports film",
      "a wedding dance song",
      "a famous singer",
      "a web series",
      "an Indian TV serial",
      "a reality show",
      "a sitcom",
      "a cartoon from your childhood",
      "a cartoon animal",
      "an animated film",
      "a Disney character",
      "a Marvel or DC hero",
      "a superhero's power",
      "a Hollywood villain",
      "a Harry Potter character",
      "a Pokémon",
      "a video game",
      "a YouTuber",
    ],
  },
  {
    id: "letters",
    label: "Letters",
    emoji: "🔤",
    prompts: [
      "a word with ‘ar’ in it",
      "a word with ‘th’ in it",
      "a word with ‘ai’ in it",
      "a word with ‘z’ in it",
      "a word with ‘x’ in it",
      "a word with double ‘o’",
      "a word with double ‘e’",
      "a word starting with ‘pa’",
      "a word starting with ‘ch’",
      "a word starting with ‘ma’",
      "a word starting with ‘su’",
      "a word starting with ‘ka’",
      "a word starting with ‘ba’",
      "a word starting with ‘st’",
      "a word starting with ‘ra’",
      "a word starting with ‘gu’",
      "a word starting with ‘la’",
      "a word starting with ‘sh’",
      "a word starting with ‘ta’",
      "a word starting with ‘no’",
      "a word ending in ‘ing’",
      "a word ending in ‘er’",
      "a word ending in ‘ar’",
      "a word ending in ‘ly’",
      "a word ending in ‘tion’",
      "a word ending in ‘ful’",
      "a word that rhymes with ‘cat’",
      "a word that rhymes with ‘day’",
      "a word that rhymes with ‘light’",
      "a word that rhymes with ‘cake’",
      "a three-letter word",
      "a five-letter word",
    ],
  },
  {
    id: "everyday",
    label: "Everyday",
    emoji: "🎒",
    prompts: [
      "something yellow",
      "something red",
      "something round",
      "something sticky",
      "something cold",
      "an app on your phone",
      "something in a school bag",
      "a cricketer",
      "a footballer",
      "a fruit",
      "a vegetable",
      "an animal",
      "a bird",
      "a sea creature",
      "a sport",
      "a country",
      "a colour",
      "a job",
      "a body part",
      "a musical instrument",
      "a board or card game",
      "a car brand",
      "a brand of phone",
      "a dog breed",
      "a flower",
      "something in a bathroom",
      "something in a fridge",
      "something in the sky",
      "something with wheels",
      "something you plug in",
      "something you wear",
      "something you pack for a trip",
      "something at the beach",
      "something that flies",
      "an ice cream flavour",
      "a pizza topping",
      "something at a birthday party",
      "a famous landmark",
    ],
  },
];

export const PACK_IDS: readonly PackId[] = PACKS.map((p) => p.id);

export function isPackId(value: unknown): value is PackId {
  return PACK_IDS.includes(value as PackId);
}

export function pack(id: PackId): Pack {
  return PACKS.find((p) => p.id === id)!;
}

/** The pack a prompt comes from (prompts are unique across packs). */
export function packOf(prompt: string): Pack | null {
  return PACKS.find((p) => p.prompts.includes(prompt)) ?? null;
}

/**
 * Next prompt: one nobody has played yet in this room, from the packs picked. When the
 * packs run out they start over (last round's prompt still waits a turn), so with a few
 * packs on, a prompt comes back only after every other one has been played.
 */
export function drawPrompt(
  packs: readonly PackId[],
  used: readonly string[],
  rng: Rng,
): { prompt: string; used: string[] } {
  const pool = packs.flatMap((id) => pack(id).prompts);
  const seen = new Set(used);
  let fresh = pool.filter((prompt) => !seen.has(prompt));
  let kept = [...used];
  if (fresh.length === 0) {
    const inPool = new Set(pool);
    const last = used[used.length - 1];
    kept = kept.filter((prompt) => !inPool.has(prompt));
    fresh = pool.length > 1 ? pool.filter((prompt) => prompt !== last) : [...pool];
  }
  const prompt = randomItem(fresh, rng);
  return { prompt, used: [...kept, prompt] };
}
