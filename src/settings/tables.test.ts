import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { GAME_NAMES } from "@/games/slugs";

import { GAME_TABLES, gameOfPath, TABLES, tableFor } from "./tables";

/** WCAG relative luminance of a #rrggbb colour. */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Each [data-table="<id>"] block's custom properties, read from globals.css. */
function cssTables(): Record<string, Record<string, string>> {
  const css = readFileSync(fileURLToPath(new URL("../app/globals.css", import.meta.url)), "utf8");
  const blocks: Record<string, Record<string, string>> = {};
  for (const [, selector, body] of css.matchAll(/([^{}]*\[data-table="[a-z-]+"\][^{}]*)\{([^}]*)\}/g)) {
    const id = /\[data-table="([a-z-]+)"\]/.exec(selector)![1];
    const props: Record<string, string> = {};
    for (const [, name, value] of body.matchAll(/(--[a-z-]+):\s*([^;]+);/g)) props[name] = value.trim();
    blocks[id] = props;
  }
  return blocks;
}

describe("tables", () => {
  it("have unique ids", () => {
    expect(new Set(TABLES.map((t) => t.id)).size).toBe(TABLES.length);
  });

  it.each(TABLES)("$label's text passes 4.5:1 on its page and its trays", (table) => {
    for (const background of [table.page, table.deep]) {
      expect(contrast(table.text, background)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(table.muted, background)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("match their blocks in globals.css", () => {
    const blocks = cssTables();
    expect(Object.keys(blocks).sort()).toEqual(TABLES.map((t) => t.id).sort());
    for (const table of TABLES) {
      const props = blocks[table.id];
      expect(props["--page"]).toBe(table.page);
      expect(props["--page-deep"]).toBe(table.deep);
      expect(props["--on-page"]).toBe(table.text);
      expect(props["--on-page-muted"]).toBe(table.muted);
      for (const name of ["--page-texture", "--page-line", "--track"]) expect(props).toHaveProperty(name);
    }
  });

  it("give every game a table", () => {
    expect(Object.keys(GAME_TABLES).sort()).toEqual(Object.keys(GAME_NAMES).sort());
  });
});

describe("tableFor", () => {
  const own = { theme: "game", matchPhone: false } as const;

  it("puts each game on its own table, and the rest of the site on felt", () => {
    expect(tableFor(own, "/imposter", false)).toBe("notebook");
    expect(tableFor(own, "/mafia", false)).toBe("midnight");
    expect(tableFor(own, "/patakha", false)).toBe("mela");
    expect(tableFor(own, "/highway-bingo", false)).toBe("night-drive");
    expect(tableFor(own, "/ulta", false)).toBe("stage");
    expect(tableFor(own, "/knights-tour", false)).toBe("felt");
    expect(tableFor(own, "/", false)).toBe("felt");
    expect(tableFor(own, "/settings", false)).toBe("felt");
    expect(tableFor(own, "/nowhere", false)).toBe("felt");
  });

  it("uses a picked table everywhere", () => {
    expect(tableFor({ theme: "stage", matchPhone: false }, "/imposter", true)).toBe("stage");
    expect(tableFor({ theme: "mela", matchPhone: false }, "/", false)).toBe("mela");
  });

  it("is Daylight while Match my phone is on and the phone is light", () => {
    expect(tableFor({ theme: "game", matchPhone: true }, "/mafia", true)).toBe("daylight");
    expect(tableFor({ theme: "midnight", matchPhone: true }, "/", true)).toBe("daylight");
    expect(tableFor({ theme: "game", matchPhone: true }, "/mafia", false)).toBe("midnight");
    expect(tableFor({ theme: "notebook", matchPhone: true }, "/", false)).toBe("notebook");
  });

  it("reads the game from the first part of the path only", () => {
    expect(gameOfPath("/mafia/anything")).toBe("mafia");
    expect(gameOfPath("/settings")).toBeNull();
    expect(gameOfPath("/constructor")).toBeNull();
    expect(gameOfPath("")).toBeNull();
  });
});
