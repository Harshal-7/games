/**
 * The game was first called Rangoli in one line, saved under games:rangoli:<thing>:v1,
 * and two patterns had other ids. Saves from then move to the new keys once, so ticks,
 * best times and drawings under way are kept.
 */

export const OLD_PREFIX = "games:rangoli:";
export const PREFIX = "games:no-lift:";
export const THINGS = ["play", "progress", "options"] as const;

/** Pattern ids that changed: Kolam became Jaal, Kolam 5×5 became Bada jaal. */
const RENAMED: Record<string, string> = { kolam: "jaal", "kolam-5": "bada-jaal" };

/** An old save with the renamed pattern ids swapped for the new ones. */
export function renameIds(raw: string): string {
  return raw.replace(/"(kolam|kolam-5)"/g, (_, id: string) => `"${RENAMED[id]}"`);
}

/** Copies old saves to the new keys where there's nothing new yet. Safe to run every visit. */
export function moveOldSaves(storage: Pick<Storage, "getItem" | "setItem">): void {
  for (const thing of THINGS) {
    const old = storage.getItem(`${OLD_PREFIX}${thing}:v1`);
    const key = `${PREFIX}${thing}:v1`;
    if (old !== null && storage.getItem(key) === null) storage.setItem(key, renameIds(old));
  }
}
