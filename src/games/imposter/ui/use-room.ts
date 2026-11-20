"use client";

import { useSyncExternalStore } from "react";

import { newRoom, parseRoom, reduce, type Action, type Room } from "../logic/room";
import { ROOM_KEY as KEY } from "../logic/saved";

/**
 * The room lives in this browser (localStorage), so a reload in the middle of a
 * round comes back to the same screen: a card that was opened stays opened.
 */
const EMPTY = newRoom();

let room: Room | undefined;
const listeners = new Set<() => void>();

function read(): Room {
  if (room === undefined) {
    try {
      room = parseRoom(localStorage.getItem(KEY)) ?? EMPTY;
    } catch {
      room = EMPTY;
    }
  }
  return room;
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    room = undefined;
    onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function useRoom(): Room {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

/** Applies an action, saves the room and redraws. Actions that change nothing are dropped. */
export function act(action: Action): void {
  const before = read();
  const after = reduce(before, action);
  if (after === before) return;
  room = after;
  try {
    localStorage.setItem(KEY, JSON.stringify(after));
  } catch {
    // Private mode or full storage: the room still works for this visit.
  }
  for (const listener of listeners) listener();
}
