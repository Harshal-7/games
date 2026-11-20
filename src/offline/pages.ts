import { GAME_NAMES } from "@/games/slugs";

/**
 * Every page on the site, which the service worker saves for offline play. Games come from
 * GAME_NAMES, so a new game is saved without anyone listing it here.
 */
export const OFFLINE_PAGES = ["/", "/settings", ...Object.keys(GAME_NAMES).map((slug) => `/${slug}`)];
