"use client";

import { useEffect } from "react";

import { SETTINGS_KEY } from "./settings";
import { applySettings, readSettings, reloadSettings } from "./store";

/**
 * Keeps <html> in step with the settings: follows the device when the theme is
 * "System", picks up changes made in another tab, and puts the attributes back if
 * anything strips them from <html>.
 */
export function SettingsSync() {
  useEffect(() => {
    const root = document.documentElement;
    const dark = window.matchMedia("(prefers-color-scheme: dark)");
    const onDeviceTheme = () => {
      if (readSettings().mode === "system") applySettings(readSettings());
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === SETTINGS_KEY) reloadSettings();
    };
    const observer = new MutationObserver(() => {
      if (!root.hasAttribute("data-mode") || !root.hasAttribute("data-accent")) applySettings(readSettings());
    });
    dark.addEventListener("change", onDeviceTheme);
    window.addEventListener("storage", onStorage);
    observer.observe(root, { attributes: true, attributeFilter: ["data-mode", "data-accent", "data-kt-board"] });
    return () => {
      dark.removeEventListener("change", onDeviceTheme);
      window.removeEventListener("storage", onStorage);
      observer.disconnect();
    };
  }, []);
  return null;
}
