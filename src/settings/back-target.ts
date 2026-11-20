import { GAME_NAMES, type GameSlug } from "@/games/slugs";

export type BackTarget = { href: string; label: string };

const HOME: BackTarget = { href: "/", label: "Games" };

/**
 * The game a Settings link came from (?from=<slug>), or null for Home and anything
 * that isn't one of our games, so a crafted link can't send anyone off the site.
 */
export function fromGame(from: string | null | undefined): GameSlug | null {
  return from && Object.hasOwn(GAME_NAMES, from) ? (from as GameSlug) : null;
}

/** Where Back on the Settings page goes: the game you came from, or the games list. */
export function backTarget(from: string | null | undefined): BackTarget {
  const game = fromGame(from);
  return game ? { href: `/${game}`, label: GAME_NAMES[game] } : HOME;
}
