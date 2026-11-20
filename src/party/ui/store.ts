"use client";

import { useSyncExternalStore } from "react";

/**
 * A game's state kept in this browser (localStorage, under `key`) and shared by every
 * component that reads it, so a reload comes back to the same screen. `parse` reads a
 * save defensively and gives null when it can't use it (the game then starts from
 * `empty`); `reduce` applies an action and gives back the same state when nothing
 * changes. Another tab saving the same key redraws this one.
 */
export function createStore<State, Action>(
  key: string,
  parse: (raw: string | null) => State | null,
  reduce: (state: State, action: Action) => State,
  empty: State,
) {
  let state: State | undefined;
  const listeners = new Set<() => void>();

  function read(): State {
    if (state === undefined) {
      try {
        state = parse(localStorage.getItem(key)) ?? empty;
      } catch {
        state = empty;
      }
    }
    return state;
  }

  function subscribe(onChange: () => void): () => void {
    listeners.add(onChange);
    const onStorage = (e: StorageEvent) => {
      if (e.key !== key) return;
      state = undefined;
      onChange();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(onChange);
      window.removeEventListener("storage", onStorage);
    };
  }

  /** The saved state. The server and the first render get `empty`. */
  function useStore(): State {
    return useSyncExternalStore(subscribe, read, () => empty);
  }

  /** Applies an action, saves and redraws. Actions that change nothing are dropped. */
  function act(action: Action): void {
    const before = read();
    const after = reduce(before, action);
    if (after === before) return;
    state = after;
    try {
      localStorage.setItem(key, JSON.stringify(after));
    } catch {
      // Private mode or full storage: the game still works for this visit.
    }
    for (const listener of listeners) listener();
  }

  return { useStore, act };
}
