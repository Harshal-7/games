import { describe, expect, it } from "vitest";

import { findPattern } from "./packs";
import { parseProgress } from "./progress";
import { moveOldSaves, renameIds } from "./saves";

function memory(start: Record<string, string>) {
  const data = new Map(Object.entries(start));
  return { data, getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
}

describe("old saves", () => {
  it("move to the new keys, with the renamed patterns' ids", () => {
    const run = { ms: 1000, hints: 0, undos: 0, runId: 1 };
    const store = memory({
      "games:rangoli:progress:v1": JSON.stringify({ best: { kolam: run, "kolam-5": run, diya: run }, endless: {} }),
      "games:rangoli:options:v1": JSON.stringify({ sound: false }),
    });
    moveOldSaves(store);
    const progress = parseProgress(store.getItem("games:no-lift:progress:v1"));
    expect(Object.keys(progress!.best).sort()).toEqual(["bada-jaal", "diya", "jaal"]);
    expect(store.getItem("games:no-lift:options:v1")).toBe('{"sound":false}');
    expect(findPattern("jaal")).not.toBeNull();
    expect(findPattern("bada-jaal")).not.toBeNull();
  });

  it("never overwrite a new save", () => {
    const store = memory({ "games:rangoli:options:v1": '{"sound":false}', "games:no-lift:options:v1": '{"sound":true}' });
    moveOldSaves(store);
    expect(store.getItem("games:no-lift:options:v1")).toBe('{"sound":true}');
  });

  it("leave other ids alone", () => {
    expect(renameIds('{"id":"kolamx","b":"kolam"}')).toBe('{"id":"kolamx","b":"jaal"}');
  });
});
