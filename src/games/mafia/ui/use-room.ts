"use client";

import { createStore } from "@/party/ui/store";

import { newRoom, parseRoom, reduce, ROOM_KEY } from "../logic/game";

/**
 * The room lives in this browser (localStorage), so a reload comes back to the same
 * screen, even mid-night.
 */
const room = createStore(ROOM_KEY, parseRoom, reduce, newRoom());

export const useRoom = room.useStore;
export const act = room.act;
