import { describe, expect, it } from "vitest";

import { DEFAULT_SETTINGS, parseSettings, SETTINGS_SCRIPT, THEME_COLORS } from "./settings";

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
    expect(parseSettings({ mode: "neon", knightsTour: { board: "marble", numbers: "yes", size: 9 } })).toEqual(
      DEFAULT_SETTINGS,
    );
  });

  it("keeps valid choices", () => {
    const saved = { rev: 2, mode: "light", knightsTour: ktSaved };
    expect(parseSettings(saved)).toEqual(saved);
  });

  it("defaults to felt and the wood board", () => {
    expect(DEFAULT_SETTINGS.mode).toBe("dark");
    expect(DEFAULT_SETTINGS.knightsTour.board).toBe("wood");
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
    // Picked again after design 4: it stays.
    expect(parseSettings({ rev: 2, mode: "dark", knightsTour: { ...ktSaved, board: "stone" } }).knightsTour.board).toBe(
      "stone",
    );
    // Other old boards stay as they were.
    expect(parseSettings({ knightsTour: { board: "tournament" } }).knightsTour.board).toBe("tournament");
  });
});

/** Runs the start-up script against a fake page and reports what it put on <html>. */
function runScript(saved: string | null, phoneIsDark = true) {
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
  new Function("document", "localStorage", "window", "matchMedia", SETTINGS_SCRIPT)(
    document,
    localStorage,
    { matchMedia },
    matchMedia,
  );
  expect(metas).toHaveLength(1);
  expect(metas[0].name).toBe("theme-color");
  return { attrs, colorScheme: document.documentElement.style.colorScheme, themeColor: metas[0].content };
}

describe("start-up script", () => {
  it("is valid JavaScript", () => {
    expect(() => new Function(SETTINGS_SCRIPT)).not.toThrow();
  });

  it("does what parseSettings does for the theme and board", () => {
    const cases: [unknown, boolean][] = [
      [null, true],
      [{ mode: "light", knightsTour: { board: "slate" } }, true],
      [{ mode: "system", knightsTour: { board: "stone" } }, false],
      [{ rev: 2, mode: "system", knightsTour: { board: "stone" } }, true],
      [{ mode: "dark", accent: "plum", knightsTour: { board: "tournament" } }, true],
      [{ mode: "neon", knightsTour: { board: "marble" } }, true],
      ["not json {", true],
    ];
    for (const [saved, phoneIsDark] of cases) {
      const raw = typeof saved === "string" ? saved : JSON.stringify(saved);
      const { attrs, colorScheme, themeColor } = runScript(raw, phoneIsDark);
      const parsed = parseSettings(typeof saved === "string" ? null : saved);
      const mode = parsed.mode === "system" ? (phoneIsDark ? "dark" : "light") : parsed.mode;
      expect(attrs).toEqual({ "data-mode": mode, "data-kt-board": parsed.knightsTour.board });
      expect(colorScheme).toBe(mode);
      expect(themeColor).toBe(THEME_COLORS[mode]);
    }
  });
});
