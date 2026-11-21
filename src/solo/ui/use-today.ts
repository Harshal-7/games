"use client";

import { useSyncExternalStore } from "react";

import { istDay, msUntilNextDay } from "../daily";

/** Wakes the listeners at midnight in India, and when the page shows again (a phone left overnight). */
function subscribe(onChange: () => void): () => void {
  let timer = 0;
  const arm = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      onChange();
      arm();
    }, msUntilNextDay(Date.now()) + 500);
  };
  const onShow = () => {
    if (document.visibilityState === "visible") {
      onChange();
      arm();
    }
  };
  arm();
  document.addEventListener("visibilitychange", onShow);
  return () => {
    window.clearTimeout(timer);
    document.removeEventListener("visibilitychange", onShow);
  };
}

/** Today in India ("2026-11-21"), or null on the server and while the page loads. */
export function useToday(): string | null {
  return useSyncExternalStore(subscribe, () => istDay(Date.now()), () => null);
}
