import { describe, expect, it } from "vitest";

import { cleanName, nameProblem, tooFew, updatePlayers, type Player } from "./players";
import { seeded } from "./random";

const rng = seeded(5);
const table = (...names: string[]): Player[] => names.map((name, i) => ({ id: `id${i}`, name }));

describe("the player list", () => {
  it("checks names", () => {
    const players = table("Riya", "Aman");
    expect(nameProblem(players, "  riya ")).toMatch(/already playing/);
    expect(nameProblem(players, "   ")).toMatch(/Type a name/);
    // Renaming someone to their own name, in any case, is fine.
    expect(nameProblem(players, "RIYA", { self: "id0" })).toBeNull();
    expect(cleanName("  Kabir   Singh  Rathore ")).toBe("Kabir Singh Rath");
  });

  it("adds, renames and removes, and gives back the same list when a name can't be used", () => {
    let players = table("Riya", "Aman");
    players = updatePlayers(players, { type: "add-player", id: "x", name: "  Zoya  " });
    expect(players.map((p) => p.name)).toEqual(["Riya", "Aman", "Zoya"]);
    expect(updatePlayers(players, { type: "add-player", id: "y", name: "zoya" })).toBe(players);
    expect(updatePlayers(players, { type: "rename-player", id: "id1", name: "Riya" })).toBe(players);
    players = updatePlayers(players, { type: "rename-player", id: "id1", name: "Aman Jr" });
    players = updatePlayers(players, { type: "remove-player", id: "id0" });
    expect(players).toEqual([
      { id: "id1", name: "Aman Jr" },
      { id: "x", name: "Zoya" },
    ]);
  });

  it("keeps to the game's limits", () => {
    const mafia = { min: 5, max: 15 };
    const full = updatePlayers([], { type: "quick-players", count: 99, rng }, mafia);
    expect(full).toHaveLength(15);
    expect(nameProblem(full, "Dev", { max: mafia.max })).toMatch(/most players \(15\)/);
    expect(updatePlayers(full, { type: "add-player", id: "z", name: "Dev" }, mafia)).toBe(full);
    expect(updatePlayers([], { type: "quick-players", count: 2, rng }, mafia)).toHaveLength(5);
    expect(tooFew(table("A", "B", "C"), mafia.min)).toBe("Add 2 more players to start.");
    expect(tooFew(full, mafia.min)).toBeNull();
  });
});
