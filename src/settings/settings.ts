import { BOARD_STYLES, PIECE_STYLES, type BoardStyleId, type PieceStyleId } from "@/games/knights-tour/styles";

/** Everything on the Settings page. Saved in this browser only. */

export const MODES = [
  { id: "system", label: "System" },
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
] as const;
export type ModeId = (typeof MODES)[number]["id"];

export const ACCENTS = [
  { id: "sage", label: "Sage" },
  { id: "indigo", label: "Indigo" },
  { id: "ocean", label: "Ocean" },
  { id: "plum", label: "Plum" },
  { id: "ember", label: "Ember" },
] as const;
export type AccentId = (typeof ACCENTS)[number]["id"];

export type KnightsTourSettings = {
  board: BoardStyleId;
  piece: PieceStyleId;
  /** Numbers on visited squares. */
  numbers: boolean;
  /** Dots on the squares the knight can jump to. */
  moves: boolean;
  /** A dotted line for the last two jumps. */
  trail: boolean;
};

export type Settings = {
  mode: ModeId;
  accent: AccentId;
  knightsTour: KnightsTourSettings;
};

export const DEFAULT_SETTINGS: Settings = {
  mode: "system",
  accent: "sage",
  knightsTour: { board: "stone", piece: "classic", numbers: true, moves: true, trail: true },
};

export const SETTINGS_KEY = "games-settings:v1";

const ids = (list: readonly { id: string }[]) => list.map((item) => item.id);

function pick<T extends string>(value: unknown, allowed: readonly { id: T }[], fallback: T): T {
  return allowed.some((item) => item.id === value) ? (value as T) : fallback;
}

const flag = (value: unknown, fallback: boolean) => (typeof value === "boolean" ? value : fallback);

/** Saved settings, with anything unknown or broken replaced by the default. */
export function parseSettings(raw: unknown): Settings {
  const data = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const kt = data.knightsTour && typeof data.knightsTour === "object" ? (data.knightsTour as Record<string, unknown>) : {};
  const d = DEFAULT_SETTINGS.knightsTour;
  return {
    mode: pick(data.mode, MODES, DEFAULT_SETTINGS.mode),
    accent: pick(data.accent, ACCENTS, DEFAULT_SETTINGS.accent),
    knightsTour: {
      board: pick(kt.board, BOARD_STYLES, d.board),
      piece: pick(kt.piece, PIECE_STYLES, d.piece),
      numbers: flag(kt.numbers, d.numbers),
      moves: flag(kt.moves, d.moves),
      trail: flag(kt.trail, d.trail),
    },
  };
}

/**
 * Runs in <head> before the first paint and puts the saved theme, colour and board
 * style on <html>, so the page never flashes the defaults. Only our own constant
 * lists go into it; saved values are checked against them, never inserted.
 */
export const SETTINGS_SCRIPT = `(function(){try{var d=document.documentElement,s={};try{s=JSON.parse(localStorage.getItem(${JSON.stringify(
  SETTINGS_KEY,
)}))||{}}catch(e){}var k=s.knightsTour||{};function p(v,l,f){return l.indexOf(v)>=0?v:f}var m=p(s.mode,${JSON.stringify(
  ids(MODES),
)},"system");if(m==="system")m=window.matchMedia&&matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";d.setAttribute("data-mode",m);d.style.colorScheme=m;d.setAttribute("data-accent",p(s.accent,${JSON.stringify(
  ids(ACCENTS),
)},${JSON.stringify(DEFAULT_SETTINGS.accent)}));d.setAttribute("data-kt-board",p(k.board,${JSON.stringify(
  ids(BOARD_STYLES),
)},${JSON.stringify(DEFAULT_SETTINGS.knightsTour.board)}))}catch(e){}})()`;
