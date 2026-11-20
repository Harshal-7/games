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
  { id: "dhaba", label: "Dhaba", tone: "dark", page: "#7a3422", deep: "#692b1b", text: "#f8ecdc", muted: "#e8cdb8" },
  { id: "stage", label: "Stage", tone: "dark", page: "#2a1733", deep: "#211129", text: "#f4ece0", muted: "#d3c3cf" },
  { id: "daylight", label: "Daylight", tone: "light", page: "#efe6d3", deep: "#e7dcc5", text: "#221c15", muted: "#5a4f3f" },
  { id: "notebook", label: "Notebook", tone: "light", page: "#dde8f1", deep: "#cfdde9", text: "#221c15", muted: "#45505b" },
  { id: "mela", label: "Mela", tone: "light", page: "#f9e3a1", deep: "#f1d68a", text: "#221c15", muted: "#5c4a2e" },
] as const;

export type Table = (typeof TABLES)[number];
export type TableId = Table["id"];
export type Tone = Table["tone"];

/** Home, Settings and any page that isn't a game. */
export const SITE_TABLE: TableId = "felt";

/** Every game's own table. A new game adds its line here. */
export const GAME_TABLES: Record<GameSlug, TableId> = {
  "knights-tour": "felt",
  imposter: "notebook",
  mafia: "midnight",
  patakha: "mela",
  "highway-bingo": "dhaba",
  ulta: "stage",
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
