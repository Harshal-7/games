"use client";

import { createStore } from "@/party/ui/store";

import { newRoom, parseRoom, reduce } from "../logic/room";

/** Where the room is saved in this browser. The recordings never are. */
export const ROOM_KEY = "games:ulta:room:v1";

/** The room lives in this browser (localStorage), so a reload comes back to the same step. */
const room = createStore(ROOM_KEY, (raw) => parseRoom(raw), reduce, newRoom());

export const useRoom = room.useStore;
export const act = room.act;
