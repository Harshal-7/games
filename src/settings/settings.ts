import { isSize, type Size } from "@/games/knights-tour/logic/board";
import { BOARD_STYLES, PIECE_STYLES, type BoardStyleId, type PieceStyleId } from "@/games/knights-tour/styles";

/** Everything on the Settings page. Saved in this browser only. */

// Stored values stay dark / light / system; the names are what people see. The default first.
export const MODES = [
  { id: "dark", label: "Felt" },
  { id: "light", label: "Daylight" },
  { id: "system", label: "Match my phone" },
] as const;
export type ModeId = (typeof MODES)[number]["id"];

/** The phone's address bar matches the page: felt green or paper. */
export const THEME_COLORS = { dark: "#1e4a38", light: "#efe6d3" } as const;

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
 * 2 = design 4: Wood became the default board. Saved settings without this mark
 * are from before it.
 */
export const SETTINGS_REV = 2;

export type Settings = {
  rev: typeof SETTINGS_REV;
  mode: ModeId;
  knightsTour: KnightsTourSettings;
};

export const DEFAULT_SETTINGS: Settings = {
  rev: SETTINGS_REV,
  mode: "dark",
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

/** Saved settings, with anything unknown or broken replaced by the default. Settings
 *  from before design 4 lose their colour (there's no colour picker any more) and an
 *  unmarked Stone board becomes Wood. */
export function parseSettings(raw: unknown): Settings {
  const data = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const kt = data.knightsTour && typeof data.knightsTour === "object" ? (data.knightsTour as Record<string, unknown>) : {};
  const d = DEFAULT_SETTINGS.knightsTour;
  const board = data.rev !== SETTINGS_REV && kt.board === OLD_DEFAULT_BOARD ? d.board : kt.board;
  return {
    rev: SETTINGS_REV,
    mode: pick(data.mode, MODES, DEFAULT_SETTINGS.mode),
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

/**
 * Runs in <head> before the first paint and puts the saved theme and board style on
 * <html>, so the page never flashes the defaults. It does what parseSettings does for
 * these two values. It also adds the theme-color meta itself (React doesn't render one),
 * so the phone's address bar matches and nothing else rewrites it. Only our own
 * constant lists go into it; saved values are checked against them, never inserted.
 */
export const SETTINGS_SCRIPT = `(function(){try{var d=document.documentElement,s={};try{s=JSON.parse(localStorage.getItem(${JSON.stringify(
  SETTINGS_KEY,
)}))||{}}catch(e){}if(typeof s!=="object")s={};var k=s.knightsTour||{};function p(v,l,f){return l.indexOf(v)>=0?v:f}var m=p(s.mode,${JSON.stringify(
  ids(MODES),
)},${JSON.stringify(DEFAULT_SETTINGS.mode)});if(m==="system")m=window.matchMedia&&matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";d.setAttribute("data-mode",m);d.style.colorScheme=m;var t=document.querySelector('meta[name="theme-color"]');if(!t){t=document.createElement("meta");t.setAttribute("name","theme-color");document.head.appendChild(t)}t.setAttribute("content",${JSON.stringify(
  THEME_COLORS,
)}[m]);var b=k.board;if(s.rev!==${SETTINGS_REV}&&b===${JSON.stringify(OLD_DEFAULT_BOARD)})b=${JSON.stringify(
  DEFAULT_SETTINGS.knightsTour.board,
)};d.setAttribute("data-kt-board",p(b,${JSON.stringify(ids(BOARD_STYLES))},${JSON.stringify(
  DEFAULT_SETTINGS.knightsTour.board,
)}))}catch(e){}})()`;
