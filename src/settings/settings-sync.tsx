"use client";

import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect } from "react";

import { SETTINGS_KEY } from "./settings";
import { applySettings, readSettings, reloadSettings } from "./store";

const WATCHED = ["data-table", "data-tone", "data-kt-board"];

/**
 * Keeps <html> in step with the settings: puts the right table on for each page as you
 * move around the site, follows the phone's light or dark setting for Match my phone,
 * picks up changes made in another tab, and puts the attributes back if anything strips
 * them from <html>.
 */
export function SettingsSync() {
  const path = usePathname();

  // A layout effect, so the new page's first paint already has its table. The first run
  // repeats what the start-up script did, which changes nothing.
  useLayoutEffect(() => {
    applySettings(readSettings(), path);
  }, [path]);

  useEffect(() => {
    const root = document.documentElement;
    const dark = window.matchMedia("(prefers-color-scheme: dark)");
    const onDeviceTheme = () => {
      if (readSettings().matchPhone) applySettings(readSettings());
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === SETTINGS_KEY) reloadSettings();
    };
    // Only re-apply when an attribute is actually missing: applying sets them again,
    // which this observer sees, so checking an attribute we never set would loop.
    const observer = new MutationObserver(() => {
      if (WATCHED.some((name) => !root.hasAttribute(name))) applySettings(readSettings());
    });
    dark.addEventListener("change", onDeviceTheme);
    window.addEventListener("storage", onStorage);
    observer.observe(root, { attributes: true, attributeFilter: WATCHED });
    return () => {
      dark.removeEventListener("change", onDeviceTheme);
      window.removeEventListener("storage", onStorage);
      observer.disconnect();
    };
  }, []);
  return null;
}
