"use client";

import { createStore } from "@/party/ui/store";

import { newRoom, parseRoom, reduce } from "../logic/room";

/** Where the options, the game on screen and recent cards' marks are saved in this browser. */
export const ROOM_KEY = "games:highway-bingo:room:v1";

const room = createStore(ROOM_KEY, (raw) => parseRoom(raw), reduce, newRoom());

export const useRoom = room.useStore;
export const act = room.act;
