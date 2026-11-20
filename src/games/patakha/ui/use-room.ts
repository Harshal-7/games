"use client";

import { createStore } from "@/party/ui/store";

import { newRoom, parseRoom, reduce } from "../logic/room";

/** Where the room is saved in this browser. */
export const ROOM_KEY = "games:patakha:room:v1";

/**
 * The room lives in this browser (localStorage), so a reload in the middle of a round
 * comes back to the same screen, with the fuse paused.
 */
const room = createStore(ROOM_KEY, (raw) => parseRoom(raw), reduce, newRoom());

export const useRoom = room.useStore;
export const act = room.act;
