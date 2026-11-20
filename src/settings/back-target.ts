import { GAME_NAMES } from "@/games/slugs";

export type BackTarget = { href: string; label: string };

const HOME: BackTarget = { href: "/", label: "Games" };

/**
 * Where Back on the Settings page goes: the game you came from (?from=<slug>), or the
 * games list. Only our own pages, so a crafted link can't send anyone off the site.
 */
export function backTarget(from: string | null | undefined): BackTarget {
  if (!from || !Object.hasOwn(GAME_NAMES, from)) return HOME;
  return { href: `/${from}`, label: GAME_NAMES[from as keyof typeof GAME_NAMES] };
}
