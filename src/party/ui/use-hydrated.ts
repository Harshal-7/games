"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** False on the server and during hydration, true after: saved games are only known in the browser. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}
