import { isSize, type Size } from "@/games/knights-tour/logic/board";
import { BOARD_STYLES, PIECE_STYLES, type BoardStyleId, type PieceStyleId } from "@/games/knights-tour/styles";

import { GAME_TABLES, SITE_TABLE, TABLES, type TableId } from "./tables";

/** Everything on the Settings page. Saved in this browser only. */

/** "game" is each game on its own table (the default); any table puts every page on it. */
export const THEMES = [
  { id: "game", label: "Each game’s own" },
  ...TABLES.map(({ id, label }) => ({ id, label })),
] as const;
export type ThemeId = "game" | TableId;

export type KnightsTourSettings = {
  board: BoardStyleId;
  piece: PieceStyleId;
  /** Numbers on visited squares. */
  numbers: boolean;
  /** Dots on the squares the knight can jump to. */
  moves: boolean;
  /** A dotted line for the last two jumps. */
  trail: boolean;
  /** A soft click on each jump and a chime at the end. */
  sound: boolean;
  /** A short buzz on each jump (phones that support it). */
  vibrate: boolean;
  /** The board size picked last time; not shown on the Settings page. */
  size: Size;
};

/**
 * 2 = design 4: Wood became the default board. Saved settings without a mark are from
 * before it.
 * 3 = colour themes: `mode` (dark / light / system) became `theme` and `matchPhone`.
 */
export const SETTINGS_REV = 3;

export type Settings = {
  rev: typeof SETTINGS_REV;
  theme: ThemeId;
  /** Daylight whenever the phone is in light mode, whatever the theme. */
  matchPhone: boolean;
  knightsTour: KnightsTourSettings;
};

export const DEFAULT_SETTINGS: Settings = {
  rev: SETTINGS_REV,
  theme: "game",
  matchPhone: false,
  knightsTour: {
    board: "wood",
    piece: "classic",
    numbers: true,
    moves: true,
    trail: true,
    sound: false,
    vibrate: false,
    size: 5,
  },
};

export const SETTINGS_KEY = "games-settings:v1";

/** The default board before design 4. Any change saves every setting, so most saved
 *  settings hold it without anyone having picked it; it moves to Wood once. */
const OLD_DEFAULT_BOARD = "stone";

const ids = (list: readonly { id: string }[]) => list.map((item) => item.id);

function pick<T extends string>(value: unknown, allowed: readonly { id: T }[], fallback: T): T {
  return allowed.some((item) => item.id === value) ? (value as T) : fallback;
}

const flag = (value: unknown, fallback: boolean) => (typeof value === "boolean" ? value : fallback);

/** Saved settings, with anything unknown or broken replaced by the default.
 *  - Before design 4 (no rev): the colour goes (there's no colour picker any more) and an
 *    unmarked Stone board becomes Wood.
 *  - Before colour themes (a saved `mode`, no `theme`): Felt becomes each game's own,
 *    Daylight stays Daylight, and Match my phone becomes each game's own with the Match
 *    my phone switch on. */
export function parseSettings(raw: unknown): Settings {
  const data = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const kt = data.knightsTour && typeof data.knightsTour === "object" ? (data.knightsTour as Record<string, unknown>) : {};
  const d = DEFAULT_SETTINGS.knightsTour;
  const board = data.rev === undefined && kt.board === OLD_DEFAULT_BOARD ? d.board : kt.board;
  const look =
    typeof data.theme === "string"
      ? { theme: pick(data.theme, THEMES, DEFAULT_SETTINGS.theme), matchPhone: flag(data.matchPhone, false) }
      : { theme: data.mode === "light" ? ("daylight" as const) : DEFAULT_SETTINGS.theme, matchPhone: data.mode === "system" };
  return {
    rev: SETTINGS_REV,
    ...look,
    knightsTour: {
      board: pick(board, BOARD_STYLES, d.board),
      piece: pick(kt.piece, PIECE_STYLES, d.piece),
      numbers: flag(kt.numbers, d.numbers),
      moves: flag(kt.moves, d.moves),
      trail: flag(kt.trail, d.trail),
      sound: flag(kt.sound, d.sound),
      vibrate: flag(kt.vibrate, d.vibrate),
      size: isSize(kt.size) ? kt.size : d.size,
    },
  };
}

const byTable = <T>(get: (table: (typeof TABLES)[number]) => T) =>
  Object.fromEntries(TABLES.map((table) => [table.id, get(table)])) as Record<TableId, T>;

/** Each table's light or dark, and the colour of the phone's address bar on it. */
export const TABLE_TONES = byTable((table) => table.tone);
export const TABLE_COLORS = byTable((table) => table.page);

const json = (value: unknown) => JSON.stringify(value);

/**
 * Runs in <head> before the first paint and puts the page's table and the board style on
 * <html>, so the page never flashes another colour. It does what parseSettings and
 * tableFor do for these values: the saved theme (or the old saved mode), the game in the
 * path, and the phone's light or dark setting for Match my phone. It also adds the
 * theme-color meta itself (React doesn't render one), so the phone's address bar matches
 * and nothing else rewrites it. Only our own constants go into it; saved values are
 * checked against them, never inserted.
 */
export const SETTINGS_SCRIPT = `(function(){try{var d=document.documentElement,s={};try{s=JSON.parse(localStorage.getItem(${json(
  SETTINGS_KEY,
)}))||{}}catch(e){}if(typeof s!=="object")s={};var k=s.knightsTour||{};function p(v,l,f){return l.indexOf(v)>=0?v:f}var th,mp;if(typeof s.theme==="string"){th=p(s.theme,${json(
  ids(THEMES),
)},${json(DEFAULT_SETTINGS.theme)});mp=s.matchPhone===true}else{th=s.mode==="light"?"daylight":${json(
  DEFAULT_SETTINGS.theme,
)};mp=s.mode==="system"}var g=${json(GAME_TABLES)},t;if(mp&&window.matchMedia&&!matchMedia("(prefers-color-scheme: dark)").matches)t="daylight";else if(th!=="game")t=th;else{var slug=location.pathname.split("/")[1]||"";t=Object.prototype.hasOwnProperty.call(g,slug)?g[slug]:${json(
  SITE_TABLE,
)}}var tone=${json(TABLE_TONES)}[t];d.setAttribute("data-table",t);d.setAttribute("data-tone",tone);d.style.colorScheme=tone;var m=document.querySelector('meta[name="theme-color"]');if(!m){m=document.createElement("meta");m.setAttribute("name","theme-color");document.head.appendChild(m)}m.setAttribute("content",${json(
  TABLE_COLORS,
)}[t]);var b=k.board;if(s.rev===undefined&&b===${json(OLD_DEFAULT_BOARD)})b=${json(
  DEFAULT_SETTINGS.knightsTour.board,
)};d.setAttribute("data-kt-board",p(b,${json(ids(BOARD_STYLES))},${json(DEFAULT_SETTINGS.knightsTour.board)}))}catch(e){}})()`;
