import { describe, expect, it } from "vitest";

import { DEFAULT_SETTINGS, parseSettings, SETTINGS_SCRIPT, TABLE_COLORS, TABLE_TONES } from "./settings";
import { tableFor } from "./tables";

const ktSaved = {
  board: "slate",
  piece: "pixel",
  numbers: false,
  moves: false,
  trail: false,
  sound: true,
  vibrate: true,
  size: 7,
};

describe("parseSettings", () => {
  it("falls back to the defaults for missing or broken values", () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings("dark")).toEqual(DEFAULT_SETTINGS);
    expect(
      parseSettings({ theme: "neon", matchPhone: "yes", knightsTour: { board: "marble", numbers: "yes", size: 9 } }),
    ).toEqual(DEFAULT_SETTINGS);
    // A table from the first set of colours, since replaced: back to each game's own.
    expect(parseSettings({ rev: 3, theme: "studio", matchPhone: true })).toMatchObject({ theme: "game", matchPhone: true });
  });

  it("keeps valid choices", () => {
    const saved = { rev: 3, theme: "mela", matchPhone: true, knightsTour: ktSaved };
    expect(parseSettings(saved)).toEqual(saved);
  });

  it("defaults to each game's own table, the phone not followed, and the wood board", () => {
    expect(DEFAULT_SETTINGS.theme).toBe("game");
    expect(DEFAULT_SETTINGS.matchPhone).toBe(false);
    expect(DEFAULT_SETTINGS.knightsTour.board).toBe("wood");
  });

  it("moves the old felt, daylight and match my phone looks over", () => {
    const look = (saved: unknown) => {
      const { theme, matchPhone } = parseSettings(saved);
      return { theme, matchPhone };
    };
    expect(look({ rev: 2, mode: "dark", knightsTour: ktSaved })).toEqual({ theme: "game", matchPhone: false });
    expect(look({ rev: 2, mode: "light", knightsTour: ktSaved })).toEqual({ theme: "daylight", matchPhone: false });
    expect(look({ rev: 2, mode: "system", knightsTour: ktSaved })).toEqual({ theme: "game", matchPhone: true });
    expect(look({ mode: "neon" })).toEqual({ theme: "game", matchPhone: false });
    // Already moved: a leftover mode changes nothing.
    expect(look({ rev: 3, theme: "midnight", matchPhone: false, mode: "system" })).toEqual({
      theme: "midnight",
      matchPhone: false,
    });
    expect(parseSettings({ rev: 2, mode: "light", knightsTour: ktSaved })).not.toHaveProperty("mode");
  });

  it("drops the colour saved before design 4", () => {
    const parsed = parseSettings({ mode: "dark", accent: "plum", knightsTour: ktSaved });
    expect(parsed).not.toHaveProperty("accent");
    expect(parsed.knightsTour).toEqual(ktSaved);
  });

  it("moves an old saved Stone board to Wood once", () => {
    // Saved before design 4 (no mark): Stone was only the old default.
    expect(parseSettings({ mode: "dark", accent: "ocean", knightsTour: { ...ktSaved, board: "stone" } }).knightsTour.board).toBe(
      "wood",
    );
    // Picked again after design 4, before or after colour themes: it stays.
    expect(parseSettings({ rev: 2, mode: "dark", knightsTour: { ...ktSaved, board: "stone" } }).knightsTour.board).toBe(
      "stone",
    );
    expect(parseSettings({ rev: 3, theme: "game", knightsTour: { ...ktSaved, board: "stone" } }).knightsTour.board).toBe(
      "stone",
    );
    // Other old boards stay as they were.
    expect(parseSettings({ knightsTour: { board: "tournament" } }).knightsTour.board).toBe("tournament");
  });
});

/** Runs the start-up script against a fake page and reports what it put on <html>. */
function runScript(saved: string | null, path: string, phoneIsDark: boolean) {
  const attrs: Record<string, string> = {};
  // The page starts without a theme-color meta; the script adds one.
  const metas: Record<string, string>[] = [];
  const document = {
    documentElement: { setAttribute: (name: string, value: string) => (attrs[name] = value), style: {} as Record<string, string> },
    querySelector: () => null,
    createElement: () => {
      const meta: Record<string, string> = {};
      return Object.assign(meta, { setAttribute: (name: string, value: string) => (meta[name] = value) });
    },
    head: { appendChild: (meta: Record<string, string>) => metas.push(meta) },
  };
  const localStorage = { getItem: () => saved };
  const matchMedia = () => ({ matches: phoneIsDark });
  new Function("document", "localStorage", "window", "matchMedia", "location", SETTINGS_SCRIPT)(
    document,
    localStorage,
    { matchMedia },
    matchMedia,
    { pathname: path },
  );
  expect(metas).toHaveLength(1);
  expect(metas[0].name).toBe("theme-color");
  return { attrs, colorScheme: document.documentElement.style.colorScheme, themeColor: metas[0].content };
}

describe("start-up script", () => {
  it("is valid JavaScript", () => {
    expect(() => new Function(SETTINGS_SCRIPT)).not.toThrow();
  });

  it("does what parseSettings and tableFor do for the table and board", () => {
    const saves: unknown[] = [
      null,
      "not json {",
      { mode: "light", knightsTour: { board: "slate" } },
      { mode: "system", knightsTour: { board: "stone" } },
      { rev: 2, mode: "system", knightsTour: { board: "stone" } },
      { rev: 2, mode: "dark", knightsTour: { board: "tournament" } },
      { mode: "dark", accent: "plum", knightsTour: { board: "tournament" } },
      { mode: "neon", knightsTour: { board: "marble" } },
      { rev: 3, theme: "game", matchPhone: false },
      { rev: 3, theme: "game", matchPhone: true },
      { rev: 3, theme: "dhaba", matchPhone: true, knightsTour: { board: "stone" } },
      // A table that's gone (the first set of colours): each game's own.
      { rev: 3, theme: "haldi", matchPhone: false },
      { rev: 3, theme: "notebook", matchPhone: "yes" },
      { rev: 3, theme: "neon", matchPhone: false, mode: "light" },
      { rev: 3, theme: 7, mode: "light" },
      [],
    ];
    const paths = ["/", "/settings", "/imposter", "/mafia/", "/patakha", "/highway-bingo", "/ulta", "/knights-tour", "/hasOwnProperty"];
    for (const saved of saves) {
      for (const path of paths) {
        for (const phoneIsDark of [true, false]) {
          const raw = typeof saved === "string" ? saved : JSON.stringify(saved);
          const { attrs, colorScheme, themeColor } = runScript(raw, path, phoneIsDark);
          const parsed = parseSettings(typeof saved === "string" ? null : saved);
          const table = tableFor(parsed, path, !phoneIsDark);
          const tone = TABLE_TONES[table];
          expect(attrs, `${raw} on ${path}`).toEqual({
            "data-table": table,
            "data-tone": tone,
            "data-kt-board": parsed.knightsTour.board,
          });
          expect(colorScheme).toBe(tone);
          expect(themeColor).toBe(TABLE_COLORS[table]);
        }
      }
    }
  });
});
