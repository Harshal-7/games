"use client";

import { createStore } from "@/party/ui/store";

import { changeOptions, DEFAULT_OPTIONS, OPTIONS_KEY, parseOptions, type Options } from "../logic/options";

const store = createStore<Options, Partial<Options>>(OPTIONS_KEY, parseOptions, changeOptions, DEFAULT_OPTIONS);

/** The picker's mode, team count and Sound switch, saved in this browser. */
export const useOptions = store.useStore;
export const setOptions = store.act;
