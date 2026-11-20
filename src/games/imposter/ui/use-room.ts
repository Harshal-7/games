"use client";

import { createStore } from "@/party/ui/store";

import { newRoom, parseRoom, reduce } from "../logic/room";
import { ROOM_KEY } from "../logic/saved";

/**
 * The room lives in this browser (localStorage), so a reload in the middle of a
 * round comes back to the same screen: a card that was opened stays opened.
 */
const room = createStore(ROOM_KEY, parseRoom, reduce, newRoom());

export const useRoom = room.useStore;
export const act = room.act;
