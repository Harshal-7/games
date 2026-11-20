/**
 * Every game's slug and name. The slug is its page (/knights-tour) and its colour on
 * the page wrapper (data-game). Kept apart from the registry so small pieces like the
 * Settings back link don't pull in the games' thumbnails.
 */
export const GAME_NAMES = {
  "knights-tour": "Knight's Tour",
  imposter: "Imposter",
  mafia: "Mafia",
  patakha: "Patakha",
} as const;

export type GameSlug = keyof typeof GAME_NAMES;
