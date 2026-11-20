"use client";

import { useSyncExternalStore } from "react";

import { DEFAULT_SETTINGS, parseSettings, SETTINGS_KEY, type Settings } from "./settings";

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

/** Puts the theme, colour and board style on <html>, like the start-up script. */
export function applySettings(settings: Settings): void {
  const root = document.documentElement;
  const mode =
    settings.mode === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : settings.mode;
  root.setAttribute("data-mode", mode);
  root.style.colorScheme = mode;
  root.setAttribute("data-accent", settings.accent);
  root.setAttribute("data-kt-board", settings.knightsTour.board);
}
