import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { OFFLINE_PAGES } from "./pages";

/** The path of every page.tsx in src/app. */
function appPages(dir = fileURLToPath(new URL("../app", import.meta.url)), path = ""): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory()) return appPages(`${dir}/${entry.name}`, `${path}/${entry.name}`);
    return entry.name === "page.tsx" ? [path || "/"] : [];
  });
}

describe("offline pages", () => {
  it("lists every page the site has, once", () => {
    expect([...OFFLINE_PAGES].sort()).toEqual(appPages().sort());
  });
});
