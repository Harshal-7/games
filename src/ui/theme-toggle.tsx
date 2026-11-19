"use client";

import { useSyncExternalStore } from "react";

import { MoonIcon, SunIcon } from "./icons";
import { MODE_STORAGE_KEY } from "./theme";

type Mode = "light" | "dark";

function readMode(): Mode | null {
  const m = document.documentElement.getAttribute("data-mode");
  return m === "light" || m === "dark" ? m : null;
}

function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-mode"] });
  return () => observer.disconnect();
}

/** Sun in dark mode, moon in light mode. The icon swap is pure CSS, so it never flickers. */
export function ThemeToggle() {
  const mode = useSyncExternalStore(subscribe, readMode, () => null);
  const next: Mode = mode === "dark" ? "light" : "dark";

  function toggle() {
    const root = document.documentElement;
    const to: Mode = readMode() === "dark" ? "light" : "dark";
    root.setAttribute("data-mode", to);
    root.style.colorScheme = to;
    try {
      localStorage.setItem(MODE_STORAGE_KEY, to);
    } catch {
      // Private mode or blocked storage: the switch still works for this visit.
    }
  }

  return (
    <button
      type="button"
      className="icon-btn theme-toggle"
      onClick={toggle}
      aria-label={mode ? `Switch to ${next} theme` : "Switch between light and dark theme"}
    >
      <SunIcon className="theme-sun" />
      <MoonIcon className="theme-moon" />
    </button>
  );
}
