"use client";

import { useSyncExternalStore } from "react";

import { DEFAULT_SETTINGS, parseSettings, SETTINGS_KEY, TABLE_COLORS, TABLE_TONES, type Settings } from "./settings";
import { tableFor } from "./tables";

let current: Settings | undefined;
const listeners = new Set<() => void>();

export function readSettings(): Settings {
  if (current === undefined) {
    let raw: unknown = null;
    try {
      raw = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "null");
    } catch {
      // Blocked storage or a broken value: use the defaults.
    }
    current = parseSettings(raw);
  }
  return current;
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

/** The saved settings. The server and the first render use the defaults. */
export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, readSettings, () => DEFAULT_SETTINGS);
}

/** Changes, saves and applies settings straight away. */
export function updateSettings(change: (settings: Settings) => Settings): void {
  current = change(readSettings());
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(current));
  } catch {
    // Private mode or full storage: still applies for this visit.
  }
  applySettings(current);
  for (const listener of listeners) listener();
}

/** Re-reads the saved settings (another tab changed them). */
export function reloadSettings(): void {
  current = undefined;
  applySettings(readSettings());
  for (const listener of listeners) listener();
}

/** Whether the phone (or laptop) is set to light mode. */
export const phoneIsLight = () => !window.matchMedia("(prefers-color-scheme: dark)").matches;

/**
 * Puts the page's table and the board style on <html>, like the start-up script. The
 * table depends on the page, so a client-side move to another page applies it again
 * with the new path.
 */
export function applySettings(settings: Settings, path = location.pathname): void {
  const root = document.documentElement;
  const table = tableFor(settings, path, phoneIsLight());
  const tone = TABLE_TONES[table];
  root.setAttribute("data-table", table);
  root.setAttribute("data-tone", tone);
  root.style.colorScheme = tone;
  // The start-up script made this meta; make it again if something removed it.
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", TABLE_COLORS[table]);
  root.setAttribute("data-kt-board", settings.knightsTour.board);
}
