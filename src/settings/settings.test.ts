import { describe, expect, it } from "vitest";

import { DEFAULT_SETTINGS, parseSettings, SETTINGS_SCRIPT } from "./settings";

describe("settings", () => {
  it("falls back to the defaults for missing or broken values", () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings({ mode: "neon", accent: 3, knightsTour: { board: "wood", numbers: "yes", size: 9 } })).toEqual(
      DEFAULT_SETTINGS,
    );
  });

  it("keeps valid choices", () => {
    const saved = {
      mode: "dark",
      accent: "plum",
      knightsTour: {
        board: "slate",
        piece: "pixel",
        numbers: false,
        moves: false,
        trail: false,
        sound: true,
        vibrate: true,
        size: 7,
      },
    };
    expect(parseSettings(saved)).toEqual(saved);
  });

  it("start-up script is valid JavaScript", () => {
    expect(() => new Function(SETTINGS_SCRIPT)).not.toThrow();
  });
});
