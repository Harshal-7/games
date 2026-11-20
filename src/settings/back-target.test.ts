import { describe, expect, it } from "vitest";

import { backTarget } from "./back-target";

describe("backTarget", () => {
  it("goes back to the game you came from", () => {
    expect(backTarget("knights-tour")).toEqual({ href: "/knights-tour", label: "Knight's Tour" });
    expect(backTarget("imposter")).toEqual({ href: "/imposter", label: "Imposter" });
  });

  it("goes to the games list for anything else", () => {
    const home = { href: "/", label: "Games" };
    for (const from of [null, undefined, "", "home", "//evil.com", "javascript:alert(1)", "/imposter", "toString", "__proto__"]) {
      expect(backTarget(from)).toEqual(home);
    }
  });
});
