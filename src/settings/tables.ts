import type { GameSlug } from "@/games/slugs";

/**
 * The table colours: what the page is made of. Only the page changes from table to
 * table; cards, buttons and each game's colour stay the same. Dark tables use felt's
 * cards and shadows, light ones daylight's (html[data-tone="light"] in globals.css).
 *
 * The CSS for each table is its html[data-table="<id>"] block in globals.css; a test
 * checks those blocks against the colours here, and that the text passes 4.5:1.
 */
export const TABLES = [
  { id: "felt", label: "Felt", tone: "dark", page: "#1e4a38", deep: "#173b2c", text: "#f5ecd9", muted: "#cdc3aa" },
  { id: "midnight", label: "Midnight", tone: "dark", page: "#172340", deep: "#111a31", text: "#f1ecdf", muted: "#c5c7d4" },
  { id: "asphalt", label: "Asphalt", tone: "dark", page: "#2d3236", deep: "#23272a", text: "#f2efe8", muted: "#c8c6c0" },
  { id: "studio", label: "Studio", tone: "dark", page: "#221d1b", deep: "#191513", text: "#f3ebdd", muted: "#cbbfae" },
  { id: "daylight", label: "Daylight", tone: "light", page: "#efe6d3", deep: "#e7dcc5", text: "#221c15", muted: "#5a4f3f" },
  { id: "blush", label: "Blush", tone: "light", page: "#f4ddd6", deep: "#ecd0c7", text: "#221c15", muted: "#5e4943" },
  { id: "haldi", label: "Haldi", tone: "light", page: "#f7e4c6", deep: "#efd8b4", text: "#221c15", muted: "#5c4a2e" },
] as const;

export type Table = (typeof TABLES)[number];
export type TableId = Table["id"];
export type Tone = Table["tone"];

/** Home, Settings and any page that isn't a game. */
export const SITE_TABLE: TableId = "felt";

/** Every game's own table. A new game adds its line here. */
export const GAME_TABLES: Record<GameSlug, TableId> = {
  "knights-tour": "felt",
  imposter: "blush",
  mafia: "midnight",
  patakha: "haldi",
  "highway-bingo": "asphalt",
  ulta: "studio",
  "finger-picker": "felt",
};

/** The game whose page this is: the first part of the path, if it's a game's slug. */
export function gameOfPath(path: string): GameSlug | null {
  const slug = path.split("/")[1] ?? "";
  return Object.hasOwn(GAME_TABLES, slug) ? (slug as GameSlug) : null;
}

/**
 * The table a page sits on. A picked table is used everywhere; "game" means each game's
 * own, and the site's table off the games. Match my phone turns any of them into
 * Daylight while the phone is in light mode.
 */
export function tableFor(
  choice: { theme: "game" | TableId; matchPhone: boolean },
  path: string,
  phoneIsLight: boolean,
): TableId {
  if (choice.matchPhone && phoneIsLight) return "daylight";
  if (choice.theme !== "game") return choice.theme;
  const game = gameOfPath(path);
  return game ? GAME_TABLES[game] : SITE_TABLE;
}

export function tableById(id: TableId): Table {
  return TABLES.find((table) => table.id === id) ?? TABLES[0];
}
